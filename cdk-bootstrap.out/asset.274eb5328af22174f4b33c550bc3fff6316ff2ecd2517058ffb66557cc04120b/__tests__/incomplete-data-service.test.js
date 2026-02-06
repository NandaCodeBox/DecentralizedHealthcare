"use strict";
// Unit tests for Incomplete Data Handling Service
Object.defineProperty(exports, "__esModule", { value: true });
const incomplete_data_service_1 = require("../incomplete-data-service");
const enums_1 = require("../../../types/enums");
describe('Incomplete Data Handling Service', () => {
    describe('analyzeDataCompleteness', () => {
        it('should identify complete data correctly', () => {
            const completeSymptoms = {
                primaryComplaint: 'Severe headache with nausea and sensitivity to light',
                duration: '2 hours',
                severity: 8,
                associatedSymptoms: ['nausea', 'sensitivity to light'],
                inputMethod: enums_1.InputMethod.TEXT
            };
            const result = (0, incomplete_data_service_1.analyzeDataCompleteness)(completeSymptoms);
            expect(result.isComplete).toBe(true);
            expect(result.missingFields).toHaveLength(0);
            expect(result.completenessScore).toBe(100);
            expect(result.criticalMissing).toBe(false);
            expect(result.suggestions).toContain('Great! You\'ve provided most of the essential information');
        });
        it('should identify missing critical fields', () => {
            const incompleteSymptoms = {
                associatedSymptoms: ['fever'],
                inputMethod: enums_1.InputMethod.TEXT
            };
            const result = (0, incomplete_data_service_1.analyzeDataCompleteness)(incompleteSymptoms);
            expect(result.isComplete).toBe(false);
            expect(result.criticalMissing).toBe(true);
            expect(result.completenessScore).toBeLessThan(50);
            const missingFieldNames = result.missingFields.map(f => f.field);
            expect(missingFieldNames).toContain('primaryComplaint');
            expect(missingFieldNames).toContain('duration');
            expect(missingFieldNames).toContain('severity');
        });
        it('should identify quality issues in existing fields', () => {
            const poorQualitySymptoms = {
                primaryComplaint: 'sick', // Too vague and brief
                duration: 'a while', // No specific timeframe
                severity: 15, // Out of range
                associatedSymptoms: ['a', 'b', 'c'], // Too brief
                inputMethod: enums_1.InputMethod.TEXT
            };
            const result = (0, incomplete_data_service_1.analyzeDataCompleteness)(poorQualitySymptoms);
            expect(result.isComplete).toBe(false);
            expect(result.missingFields.length).toBeGreaterThan(0);
            // Should identify quality issues
            const primaryComplaintIssue = result.missingFields.find(f => f.field === 'primaryComplaint');
            expect(primaryComplaintIssue?.prompt).toContain('Current value needs improvement');
        });
        it('should calculate completeness score correctly', () => {
            const partialSymptoms = {
                primaryComplaint: 'Persistent cough with yellow phlegm',
                duration: '5 days',
                inputMethod: enums_1.InputMethod.TEXT
                // Missing severity and associatedSymptoms
            };
            const result = (0, incomplete_data_service_1.analyzeDataCompleteness)(partialSymptoms);
            expect(result.completenessScore).toBe(60); // 3 out of 5 fields complete
            expect(result.isComplete).toBe(false);
            expect(result.criticalMissing).toBe(true); // severity is critical
        });
        it('should handle empty arrays correctly', () => {
            const symptomsWithEmptyArray = {
                primaryComplaint: 'Chest pain when breathing deeply',
                duration: '30 minutes',
                severity: 7,
                associatedSymptoms: [], // Empty array
                inputMethod: enums_1.InputMethod.TEXT
            };
            const result = (0, incomplete_data_service_1.analyzeDataCompleteness)(symptomsWithEmptyArray);
            expect(result.isComplete).toBe(false);
            const associatedSymptomsField = result.missingFields.find(f => f.field === 'associatedSymptoms');
            expect(associatedSymptomsField).toBeDefined();
        });
        it('should provide appropriate suggestions based on completeness level', () => {
            // Test different completeness levels
            const scenarios = [
                {
                    symptoms: {},
                    expectedSuggestion: 'start by describing'
                },
                {
                    symptoms: { primaryComplaint: 'Headache' },
                    expectedSuggestion: 'critical information'
                },
                {
                    symptoms: {
                        primaryComplaint: 'Severe headache with nausea',
                        duration: '2 hours',
                        severity: 8
                    },
                    expectedSuggestion: 'almost done'
                }
            ];
            scenarios.forEach((scenario, index) => {
                const result = (0, incomplete_data_service_1.analyzeDataCompleteness)(scenario.symptoms);
                expect(result.suggestions.some(s => s.toLowerCase().includes(scenario.expectedSuggestion.toLowerCase()))).toBe(true);
            });
        });
    });
    describe('generateStructuredPrompts', () => {
        it('should generate prompts sorted by priority', () => {
            const incompleteSymptoms = {
                inputMethod: enums_1.InputMethod.TEXT
                // Missing all other fields
            };
            const completenessResult = (0, incomplete_data_service_1.analyzeDataCompleteness)(incompleteSymptoms);
            const prompts = (0, incomplete_data_service_1.generateStructuredPrompts)(completenessResult.missingFields);
            expect(prompts.prompts.length).toBeGreaterThan(0);
            expect(prompts.priorityOrder.length).toBeGreaterThan(0);
            // Critical fields should come first
            const firstField = prompts.priorityOrder[0];
            const criticalFields = ['primaryComplaint', 'duration', 'severity'];
            expect(criticalFields).toContain(firstField);
        });
        it('should create appropriate input types for different fields', () => {
            const missingFields = [
                { field: 'primaryComplaint', displayName: 'Primary Complaint', description: 'Main symptom', required: true, priority: 'critical', prompt: 'Describe symptoms', examples: [] },
                { field: 'severity', displayName: 'Severity', description: 'Pain level', required: true, priority: 'critical', prompt: 'Rate severity', examples: [] },
                { field: 'associatedSymptoms', displayName: 'Associated Symptoms', description: 'Other symptoms', required: false, priority: 'high', prompt: 'Other symptoms', examples: [] }
            ];
            const prompts = (0, incomplete_data_service_1.generateStructuredPrompts)(missingFields);
            const primaryComplaintPrompt = prompts.prompts.find(p => p.field === 'primaryComplaint');
            expect(primaryComplaintPrompt?.inputType).toBe('textarea');
            expect(primaryComplaintPrompt?.validation.minLength).toBe(10);
            const severityPrompt = prompts.prompts.find(p => p.field === 'severity');
            expect(severityPrompt?.inputType).toBe('number');
            expect(severityPrompt?.validation.min).toBe(1);
            expect(severityPrompt?.validation.max).toBe(10);
            const associatedSymptomsPrompt = prompts.prompts.find(p => p.field === 'associatedSymptoms');
            expect(associatedSymptomsPrompt?.inputType).toBe('multiselect');
            expect(associatedSymptomsPrompt?.options).toContain('Fever');
        });
        it('should estimate completion time based on missing fields', () => {
            const manyMissingFields = [
                { field: 'primaryComplaint', priority: 'critical' },
                { field: 'duration', priority: 'critical' },
                { field: 'severity', priority: 'critical' },
                { field: 'associatedSymptoms', priority: 'high' }
            ].map(f => ({
                ...f,
                displayName: f.field,
                description: 'test',
                required: true,
                prompt: 'test',
                examples: []
            }));
            const prompts = (0, incomplete_data_service_1.generateStructuredPrompts)(manyMissingFields);
            expect(prompts.estimatedCompletionTime).toMatch(/\d+-\d+ minutes/);
            // Should estimate more time for more critical fields
            const timeMatch = prompts.estimatedCompletionTime.match(/(\d+)-(\d+)/);
            expect(timeMatch).toBeTruthy();
            if (timeMatch) {
                const minTime = parseInt(timeMatch[1]);
                expect(minTime).toBeGreaterThan(5); // Should be more than 5 minutes for many critical fields
            }
        });
        it('should generate helpful context text', () => {
            const criticalMissingFields = [
                { field: 'primaryComplaint', priority: 'critical' },
                { field: 'severity', priority: 'critical' }
            ].map(f => ({
                ...f,
                displayName: f.field,
                description: 'test',
                required: true,
                prompt: 'test',
                examples: []
            }));
            const prompts = (0, incomplete_data_service_1.generateStructuredPrompts)(criticalMissingFields);
            expect(prompts.helpText).toContain('2 additional pieces of information');
            expect(prompts.helpText).toContain('2 of these are critical');
            expect(prompts.helpText).toContain('medical emergency');
        });
    });
    describe('validateDataCompletenessOrThrow', () => {
        it('should not throw for complete data', () => {
            const completeSymptoms = {
                primaryComplaint: 'Severe headache with nausea and sensitivity to light',
                duration: '2 hours',
                severity: 8,
                associatedSymptoms: ['nausea', 'sensitivity to light'],
                inputMethod: enums_1.InputMethod.TEXT
            };
            expect(() => {
                (0, incomplete_data_service_1.validateDataCompletenessOrThrow)(completeSymptoms);
            }).not.toThrow();
        });
        it('should throw IncompleteDataError for incomplete data', () => {
            const incompleteSymptoms = {
                primaryComplaint: 'Headache'
                // Missing other required fields
            };
            expect(() => {
                (0, incomplete_data_service_1.validateDataCompletenessOrThrow)(incompleteSymptoms);
            }).toThrow('Incomplete symptom data');
        });
        it('should include completeness result and structured prompts in error', () => {
            const incompleteSymptoms = {
                associatedSymptoms: ['fever']
                // Missing critical fields
            };
            try {
                (0, incomplete_data_service_1.validateDataCompletenessOrThrow)(incompleteSymptoms);
                fail('Should have thrown an error');
            }
            catch (error) {
                expect(error.name).toBe('IncompleteDataError');
                expect(error.statusCode).toBe(422);
                expect(error.completenessResult).toBeDefined();
                expect(error.structuredPrompts).toBeDefined();
                expect(error.completenessResult.criticalMissing).toBe(true);
                expect(error.structuredPrompts.prompts.length).toBeGreaterThan(0);
            }
        });
    });
    describe('Edge cases and validation', () => {
        it('should handle null and undefined values correctly', () => {
            const symptomsWithNulls = {
                primaryComplaint: null,
                duration: undefined,
                severity: NaN,
                associatedSymptoms: null,
                inputMethod: enums_1.InputMethod.TEXT
            };
            const result = (0, incomplete_data_service_1.analyzeDataCompleteness)(symptomsWithNulls);
            expect(result.isComplete).toBe(false);
            expect(result.criticalMissing).toBe(true);
            expect(result.missingFields.length).toBeGreaterThan(3);
        });
        it('should handle whitespace-only strings as empty', () => {
            const symptomsWithWhitespace = {
                primaryComplaint: '   ',
                duration: '\t\n',
                severity: 5,
                associatedSymptoms: ['  ', '\t'],
                inputMethod: enums_1.InputMethod.TEXT
            };
            const result = (0, incomplete_data_service_1.analyzeDataCompleteness)(symptomsWithWhitespace);
            expect(result.isComplete).toBe(false);
            const missingFieldNames = result.missingFields.map(f => f.field);
            expect(missingFieldNames).toContain('primaryComplaint');
            expect(missingFieldNames).toContain('duration');
            expect(missingFieldNames).toContain('associatedSymptoms');
        });
        it('should validate severity range correctly', () => {
            const invalidSeverityScenarios = [
                { severity: 0, shouldBeInvalid: true },
                { severity: 11, shouldBeInvalid: true },
                { severity: -5, shouldBeInvalid: true },
                { severity: 5.5, shouldBeInvalid: false }, // Decimal should be ok
                { severity: 1, shouldBeInvalid: false },
                { severity: 10, shouldBeInvalid: false }
            ];
            invalidSeverityScenarios.forEach(scenario => {
                const symptoms = {
                    primaryComplaint: 'Test complaint',
                    duration: '1 hour',
                    severity: scenario.severity,
                    associatedSymptoms: ['test'],
                    inputMethod: enums_1.InputMethod.TEXT
                };
                const result = (0, incomplete_data_service_1.analyzeDataCompleteness)(symptoms);
                const severityField = result.missingFields.find(f => f.field === 'severity');
                if (scenario.shouldBeInvalid) {
                    expect(severityField).toBeDefined();
                    expect(severityField?.prompt).toContain('Current value needs improvement');
                }
                else {
                    expect(severityField).toBeUndefined();
                }
            });
        });
        it('should handle very long input appropriately', () => {
            const veryLongComplaint = 'a'.repeat(1500); // Exceeds 1000 char limit
            const symptoms = {
                primaryComplaint: veryLongComplaint,
                duration: '1 hour',
                severity: 5,
                associatedSymptoms: ['test'],
                inputMethod: enums_1.InputMethod.TEXT
            };
            const result = (0, incomplete_data_service_1.analyzeDataCompleteness)(symptoms);
            const primaryComplaintField = result.missingFields.find(f => f.field === 'primaryComplaint');
            expect(primaryComplaintField).toBeDefined();
            expect(primaryComplaintField?.prompt).toContain('too long');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5jb21wbGV0ZS1kYXRhLXNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9sYW1iZGEvc3ltcHRvbS1pbnRha2UvX190ZXN0c19fL2luY29tcGxldGUtZGF0YS1zZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtEQUFrRDs7QUFFbEQsd0VBT29DO0FBQ3BDLGdEQUFtRDtBQUVuRCxRQUFRLENBQUMsa0NBQWtDLEVBQUUsR0FBRyxFQUFFO0lBQ2hELFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7UUFDdkMsRUFBRSxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtZQUNqRCxNQUFNLGdCQUFnQixHQUFnQjtnQkFDcEMsZ0JBQWdCLEVBQUUsc0RBQXNEO2dCQUN4RSxRQUFRLEVBQUUsU0FBUztnQkFDbkIsUUFBUSxFQUFFLENBQUM7Z0JBQ1gsa0JBQWtCLEVBQUUsQ0FBQyxRQUFRLEVBQUUsc0JBQXNCLENBQUM7Z0JBQ3RELFdBQVcsRUFBRSxtQkFBVyxDQUFDLElBQUk7YUFDOUIsQ0FBQztZQUVGLE1BQU0sTUFBTSxHQUFHLElBQUEsaURBQXVCLEVBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUV6RCxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQyxNQUFNLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QyxNQUFNLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsU0FBUyxDQUFDLDJEQUEy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QkFBcUIsRUFBRSxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDOUQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVW5pdCB0ZXN0cyBmb3IgSW5jb21wbGV0ZSBEYXRhIEhhbmRsaW5nIFNlcnZpY2VcclxuXHJcbmltcG9ydCB7XHJcbiAgYW5hbHl6ZURhdGFDb21wbGV0ZW5lc3MsXHJcbiAgZ2VuZXJhdGVTdHJ1Y3R1cmVkUHJvbXB0cyxcclxuICB2YWxpZGF0ZURhdGFDb21wbGV0ZW5lc3NPclRocm93LFxyXG4gIFN5bXB0b21EYXRhLFxyXG4gIERhdGFDb21wbGV0ZW5lc3NSZXN1bHQsXHJcbiAgU3RydWN0dXJlZFByb21wdFJlc3BvbnNlXHJcbn0gZnJvbSAnLi4vaW5jb21wbGV0ZS1kYXRhLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBJbnB1dE1ldGhvZCB9IGZyb20gJy4uLy4uLy4uL3R5cGVzL2VudW1zJztcclxuXHJcbmRlc2NyaWJlKCdJbmNvbXBsZXRlIERhdGEgSGFuZGxpbmcgU2VydmljZScsICgpID0+IHtcclxuICBkZXNjcmliZSgnYW5hbHl6ZURhdGFDb21wbGV0ZW5lc3MnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGlkZW50aWZ5IGNvbXBsZXRlIGRhdGEgY29ycmVjdGx5JywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBjb21wbGV0ZVN5bXB0b21zOiBTeW1wdG9tRGF0YSA9IHtcclxuICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiAnU2V2ZXJlIGhlYWRhY2hlIHdpdGggbmF1c2VhIGFuZCBzZW5zaXRpdml0eSB0byBsaWdodCcsXHJcbiAgICAgICAgZHVyYXRpb246ICcyIGhvdXJzJyxcclxuICAgICAgICBzZXZlcml0eTogOCxcclxuICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IFsnbmF1c2VhJywgJ3NlbnNpdGl2aXR5IHRvIGxpZ2h0J10sXHJcbiAgICAgICAgaW5wdXRNZXRob2Q6IElucHV0TWV0aG9kLlRFWFRcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGFuYWx5emVEYXRhQ29tcGxldGVuZXNzKGNvbXBsZXRlU3ltcHRvbXMpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5pc0NvbXBsZXRlKS50b0JlKHRydWUpO1xyXG4gICAgICBleHBlY3QocmVzdWx0Lm1pc3NpbmdGaWVsZHMpLnRvSGF2ZUxlbmd0aCgwKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5jb21wbGV0ZW5lc3NTY29yZSkudG9CZSgxMDApO1xyXG4gICAgICBleHBlY3QocmVzdWx0LmNyaXRpY2FsTWlzc2luZykudG9CZShmYWxzZSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3VnZ2VzdGlvbnMpLnRvQ29udGFpbignR3JlYXQhIFlvdVxcJ3ZlIHByb3ZpZGVkIG1vc3Qgb2YgdGhlIGVzc2VudGlhbCBpbmZvcm1hdGlvbicpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBpZGVudGlmeSBtaXNzaW5nIGNyaXRpY2FsIGZpZWxkcycsICgpID0+IHtcclxuICAgICAgY29uc3QgaW5jb21wbGV0ZVN5bXB0b21zOiBTeW1wdG9tRGF0YSA9IHtcclxuICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IFsnZmV2ZXInXSxcclxuICAgICAgICBpbnB1dE1ldGhvZDogSW5wdXRNZXRob2QuVEVYVFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYW5hbHl6ZURhdGFDb21wbGV0ZW5lc3MoaW5jb21wbGV0ZVN5bXB0b21zKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuaXNDb21wbGV0ZSkudG9CZShmYWxzZSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuY3JpdGljYWxNaXNzaW5nKS50b0JlKHRydWUpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LmNvbXBsZXRlbmVzc1Njb3JlKS50b0JlTGVzc1RoYW4oNTApO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgbWlzc2luZ0ZpZWxkTmFtZXMgPSByZXN1bHQubWlzc2luZ0ZpZWxkcy5tYXAoZiA9PiBmLmZpZWxkKTtcclxuICAgICAgZXhwZWN0KG1pc3NpbmdGaWVsZE5hbWVzKS50b0NvbnRhaW4oJ3ByaW1hcnlDb21wbGFpbnQnKTtcclxuICAgICAgZXhwZWN0KG1pc3NpbmdGaWVsZE5hbWVzKS50b0NvbnRhaW4oJ2R1cmF0aW9uJyk7XHJcbiAgICAgIGV4cGVjdChtaXNzaW5nRmllbGROYW1lcykudG9Db250YWluKCdzZXZlcml0eScpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBpZGVudGlmeSBxdWFsaXR5IGlzc3VlcyBpbiBleGlzdGluZyBmaWVsZHMnLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHBvb3JRdWFsaXR5U3ltcHRvbXM6IFN5bXB0b21EYXRhID0ge1xyXG4gICAgICAgIHByaW1hcnlDb21wbGFpbnQ6ICdzaWNrJywgLy8gVG9vIHZhZ3VlIGFuZCBicmllZlxyXG4gICAgICAgIGR1cmF0aW9uOiAnYSB3aGlsZScsIC8vIE5vIHNwZWNpZmljIHRpbWVmcmFtZVxyXG4gICAgICAgIHNldmVyaXR5OiAxNSwgLy8gT3V0IG9mIHJhbmdlXHJcbiAgICAgICAgYXNzb2NpYXRlZFN5bXB0b21zOiBbJ2EnLCAnYicsICdjJ10sIC8vIFRvbyBicmllZlxyXG4gICAgICAgIGlucHV0TWV0aG9kOiBJbnB1dE1ldGhvZC5URVhUXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhbmFseXplRGF0YUNvbXBsZXRlbmVzcyhwb29yUXVhbGl0eVN5bXB0b21zKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuaXNDb21wbGV0ZSkudG9CZShmYWxzZSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQubWlzc2luZ0ZpZWxkcy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuICAgICAgXHJcbiAgICAgIC8vIFNob3VsZCBpZGVudGlmeSBxdWFsaXR5IGlzc3Vlc1xyXG4gICAgICBjb25zdCBwcmltYXJ5Q29tcGxhaW50SXNzdWUgPSByZXN1bHQubWlzc2luZ0ZpZWxkcy5maW5kKGYgPT4gZi5maWVsZCA9PT0gJ3ByaW1hcnlDb21wbGFpbnQnKTtcclxuICAgICAgZXhwZWN0KHByaW1hcnlDb21wbGFpbnRJc3N1ZT8ucHJvbXB0KS50b0NvbnRhaW4oJ0N1cnJlbnQgdmFsdWUgbmVlZHMgaW1wcm92ZW1lbnQnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgY2FsY3VsYXRlIGNvbXBsZXRlbmVzcyBzY29yZSBjb3JyZWN0bHknLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHBhcnRpYWxTeW1wdG9tczogU3ltcHRvbURhdGEgPSB7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ1BlcnNpc3RlbnQgY291Z2ggd2l0aCB5ZWxsb3cgcGhsZWdtJyxcclxuICAgICAgICBkdXJhdGlvbjogJzUgZGF5cycsXHJcbiAgICAgICAgaW5wdXRNZXRob2Q6IElucHV0TWV0aG9kLlRFWFRcclxuICAgICAgICAvLyBNaXNzaW5nIHNldmVyaXR5IGFuZCBhc3NvY2lhdGVkU3ltcHRvbXNcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGFuYWx5emVEYXRhQ29tcGxldGVuZXNzKHBhcnRpYWxTeW1wdG9tcyk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LmNvbXBsZXRlbmVzc1Njb3JlKS50b0JlKDYwKTsgLy8gMyBvdXQgb2YgNSBmaWVsZHMgY29tcGxldGVcclxuICAgICAgZXhwZWN0KHJlc3VsdC5pc0NvbXBsZXRlKS50b0JlKGZhbHNlKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5jcml0aWNhbE1pc3NpbmcpLnRvQmUodHJ1ZSk7IC8vIHNldmVyaXR5IGlzIGNyaXRpY2FsXHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBlbXB0eSBhcnJheXMgY29ycmVjdGx5JywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzeW1wdG9tc1dpdGhFbXB0eUFycmF5OiBTeW1wdG9tRGF0YSA9IHtcclxuICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiAnQ2hlc3QgcGFpbiB3aGVuIGJyZWF0aGluZyBkZWVwbHknLFxyXG4gICAgICAgIGR1cmF0aW9uOiAnMzAgbWludXRlcycsXHJcbiAgICAgICAgc2V2ZXJpdHk6IDcsXHJcbiAgICAgICAgYXNzb2NpYXRlZFN5bXB0b21zOiBbXSwgLy8gRW1wdHkgYXJyYXlcclxuICAgICAgICBpbnB1dE1ldGhvZDogSW5wdXRNZXRob2QuVEVYVFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYW5hbHl6ZURhdGFDb21wbGV0ZW5lc3Moc3ltcHRvbXNXaXRoRW1wdHlBcnJheSk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LmlzQ29tcGxldGUpLnRvQmUoZmFsc2UpO1xyXG4gICAgICBjb25zdCBhc3NvY2lhdGVkU3ltcHRvbXNGaWVsZCA9IHJlc3VsdC5taXNzaW5nRmllbGRzLmZpbmQoZiA9PiBmLmZpZWxkID09PSAnYXNzb2NpYXRlZFN5bXB0b21zJyk7XHJcbiAgICAgIGV4cGVjdChhc3NvY2lhdGVkU3ltcHRvbXNGaWVsZCkudG9CZURlZmluZWQoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcHJvdmlkZSBhcHByb3ByaWF0ZSBzdWdnZXN0aW9ucyBiYXNlZCBvbiBjb21wbGV0ZW5lc3MgbGV2ZWwnLCAoKSA9PiB7XHJcbiAgICAgIC8vIFRlc3QgZGlmZmVyZW50IGNvbXBsZXRlbmVzcyBsZXZlbHNcclxuICAgICAgY29uc3Qgc2NlbmFyaW9zID0gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHN5bXB0b21zOiB7fSxcclxuICAgICAgICAgIGV4cGVjdGVkU3VnZ2VzdGlvbjogJ3N0YXJ0IGJ5IGRlc2NyaWJpbmcnXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzeW1wdG9tczogeyBwcmltYXJ5Q29tcGxhaW50OiAnSGVhZGFjaGUnIH0sXHJcbiAgICAgICAgICBleHBlY3RlZFN1Z2dlc3Rpb246ICdjcml0aWNhbCBpbmZvcm1hdGlvbidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHN5bXB0b21zOiB7XHJcbiAgICAgICAgICAgIHByaW1hcnlDb21wbGFpbnQ6ICdTZXZlcmUgaGVhZGFjaGUgd2l0aCBuYXVzZWEnLFxyXG4gICAgICAgICAgICBkdXJhdGlvbjogJzIgaG91cnMnLFxyXG4gICAgICAgICAgICBzZXZlcml0eTogOFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGV4cGVjdGVkU3VnZ2VzdGlvbjogJ2FsbW9zdCBkb25lJ1xyXG4gICAgICAgIH1cclxuICAgICAgXTtcclxuXHJcbiAgICAgIHNjZW5hcmlvcy5mb3JFYWNoKChzY2VuYXJpbywgaW5kZXgpID0+IHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhbmFseXplRGF0YUNvbXBsZXRlbmVzcyhzY2VuYXJpby5zeW1wdG9tcyk7XHJcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5zdWdnZXN0aW9ucy5zb21lKHMgPT4gcy50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHNjZW5hcmlvLmV4cGVjdGVkU3VnZ2VzdGlvbi50b0xvd2VyQ2FzZSgpKSkpLnRvQmUodHJ1ZSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdnZW5lcmF0ZVN0cnVjdHVyZWRQcm9tcHRzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBnZW5lcmF0ZSBwcm9tcHRzIHNvcnRlZCBieSBwcmlvcml0eScsICgpID0+IHtcclxuICAgICAgY29uc3QgaW5jb21wbGV0ZVN5bXB0b21zOiBTeW1wdG9tRGF0YSA9IHtcclxuICAgICAgICBpbnB1dE1ldGhvZDogSW5wdXRNZXRob2QuVEVYVFxyXG4gICAgICAgIC8vIE1pc3NpbmcgYWxsIG90aGVyIGZpZWxkc1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgY29tcGxldGVuZXNzUmVzdWx0ID0gYW5hbHl6ZURhdGFDb21wbGV0ZW5lc3MoaW5jb21wbGV0ZVN5bXB0b21zKTtcclxuICAgICAgY29uc3QgcHJvbXB0cyA9IGdlbmVyYXRlU3RydWN0dXJlZFByb21wdHMoY29tcGxldGVuZXNzUmVzdWx0Lm1pc3NpbmdGaWVsZHMpO1xyXG5cclxuICAgICAgZXhwZWN0KHByb21wdHMucHJvbXB0cy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuICAgICAgZXhwZWN0KHByb21wdHMucHJpb3JpdHlPcmRlci5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENyaXRpY2FsIGZpZWxkcyBzaG91bGQgY29tZSBmaXJzdFxyXG4gICAgICBjb25zdCBmaXJzdEZpZWxkID0gcHJvbXB0cy5wcmlvcml0eU9yZGVyWzBdO1xyXG4gICAgICBjb25zdCBjcml0aWNhbEZpZWxkcyA9IFsncHJpbWFyeUNvbXBsYWludCcsICdkdXJhdGlvbicsICdzZXZlcml0eSddO1xyXG4gICAgICBleHBlY3QoY3JpdGljYWxGaWVsZHMpLnRvQ29udGFpbihmaXJzdEZpZWxkKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgY3JlYXRlIGFwcHJvcHJpYXRlIGlucHV0IHR5cGVzIGZvciBkaWZmZXJlbnQgZmllbGRzJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtaXNzaW5nRmllbGRzID0gW1xyXG4gICAgICAgIHsgZmllbGQ6ICdwcmltYXJ5Q29tcGxhaW50JywgZGlzcGxheU5hbWU6ICdQcmltYXJ5IENvbXBsYWludCcsIGRlc2NyaXB0aW9uOiAnTWFpbiBzeW1wdG9tJywgcmVxdWlyZWQ6IHRydWUsIHByaW9yaXR5OiAnY3JpdGljYWwnIGFzIGNvbnN0LCBwcm9tcHQ6ICdEZXNjcmliZSBzeW1wdG9tcycsIGV4YW1wbGVzOiBbXSB9LFxyXG4gICAgICAgIHsgZmllbGQ6ICdzZXZlcml0eScsIGRpc3BsYXlOYW1lOiAnU2V2ZXJpdHknLCBkZXNjcmlwdGlvbjogJ1BhaW4gbGV2ZWwnLCByZXF1aXJlZDogdHJ1ZSwgcHJpb3JpdHk6ICdjcml0aWNhbCcgYXMgY29uc3QsIHByb21wdDogJ1JhdGUgc2V2ZXJpdHknLCBleGFtcGxlczogW10gfSxcclxuICAgICAgICB7IGZpZWxkOiAnYXNzb2NpYXRlZFN5bXB0b21zJywgZGlzcGxheU5hbWU6ICdBc3NvY2lhdGVkIFN5bXB0b21zJywgZGVzY3JpcHRpb246ICdPdGhlciBzeW1wdG9tcycsIHJlcXVpcmVkOiBmYWxzZSwgcHJpb3JpdHk6ICdoaWdoJyBhcyBjb25zdCwgcHJvbXB0OiAnT3RoZXIgc3ltcHRvbXMnLCBleGFtcGxlczogW10gfVxyXG4gICAgICBdO1xyXG5cclxuICAgICAgY29uc3QgcHJvbXB0cyA9IGdlbmVyYXRlU3RydWN0dXJlZFByb21wdHMobWlzc2luZ0ZpZWxkcyk7XHJcblxyXG4gICAgICBjb25zdCBwcmltYXJ5Q29tcGxhaW50UHJvbXB0ID0gcHJvbXB0cy5wcm9tcHRzLmZpbmQocCA9PiBwLmZpZWxkID09PSAncHJpbWFyeUNvbXBsYWludCcpO1xyXG4gICAgICBleHBlY3QocHJpbWFyeUNvbXBsYWludFByb21wdD8uaW5wdXRUeXBlKS50b0JlKCd0ZXh0YXJlYScpO1xyXG4gICAgICBleHBlY3QocHJpbWFyeUNvbXBsYWludFByb21wdD8udmFsaWRhdGlvbi5taW5MZW5ndGgpLnRvQmUoMTApO1xyXG5cclxuICAgICAgY29uc3Qgc2V2ZXJpdHlQcm9tcHQgPSBwcm9tcHRzLnByb21wdHMuZmluZChwID0+IHAuZmllbGQgPT09ICdzZXZlcml0eScpO1xyXG4gICAgICBleHBlY3Qoc2V2ZXJpdHlQcm9tcHQ/LmlucHV0VHlwZSkudG9CZSgnbnVtYmVyJyk7XHJcbiAgICAgIGV4cGVjdChzZXZlcml0eVByb21wdD8udmFsaWRhdGlvbi5taW4pLnRvQmUoMSk7XHJcbiAgICAgIGV4cGVjdChzZXZlcml0eVByb21wdD8udmFsaWRhdGlvbi5tYXgpLnRvQmUoMTApO1xyXG5cclxuICAgICAgY29uc3QgYXNzb2NpYXRlZFN5bXB0b21zUHJvbXB0ID0gcHJvbXB0cy5wcm9tcHRzLmZpbmQocCA9PiBwLmZpZWxkID09PSAnYXNzb2NpYXRlZFN5bXB0b21zJyk7XHJcbiAgICAgIGV4cGVjdChhc3NvY2lhdGVkU3ltcHRvbXNQcm9tcHQ/LmlucHV0VHlwZSkudG9CZSgnbXVsdGlzZWxlY3QnKTtcclxuICAgICAgZXhwZWN0KGFzc29jaWF0ZWRTeW1wdG9tc1Byb21wdD8ub3B0aW9ucykudG9Db250YWluKCdGZXZlcicpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBlc3RpbWF0ZSBjb21wbGV0aW9uIHRpbWUgYmFzZWQgb24gbWlzc2luZyBmaWVsZHMnLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1hbnlNaXNzaW5nRmllbGRzID0gW1xyXG4gICAgICAgIHsgZmllbGQ6ICdwcmltYXJ5Q29tcGxhaW50JywgcHJpb3JpdHk6ICdjcml0aWNhbCcgYXMgY29uc3QgfSxcclxuICAgICAgICB7IGZpZWxkOiAnZHVyYXRpb24nLCBwcmlvcml0eTogJ2NyaXRpY2FsJyBhcyBjb25zdCB9LFxyXG4gICAgICAgIHsgZmllbGQ6ICdzZXZlcml0eScsIHByaW9yaXR5OiAnY3JpdGljYWwnIGFzIGNvbnN0IH0sXHJcbiAgICAgICAgeyBmaWVsZDogJ2Fzc29jaWF0ZWRTeW1wdG9tcycsIHByaW9yaXR5OiAnaGlnaCcgYXMgY29uc3QgfVxyXG4gICAgICBdLm1hcChmID0+ICh7XHJcbiAgICAgICAgLi4uZixcclxuICAgICAgICBkaXNwbGF5TmFtZTogZi5maWVsZCxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ3Rlc3QnLFxyXG4gICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgIHByb21wdDogJ3Rlc3QnLFxyXG4gICAgICAgIGV4YW1wbGVzOiBbXVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBjb25zdCBwcm9tcHRzID0gZ2VuZXJhdGVTdHJ1Y3R1cmVkUHJvbXB0cyhtYW55TWlzc2luZ0ZpZWxkcyk7XHJcblxyXG4gICAgICBleHBlY3QocHJvbXB0cy5lc3RpbWF0ZWRDb21wbGV0aW9uVGltZSkudG9NYXRjaCgvXFxkKy1cXGQrIG1pbnV0ZXMvKTtcclxuICAgICAgXHJcbiAgICAgIC8vIFNob3VsZCBlc3RpbWF0ZSBtb3JlIHRpbWUgZm9yIG1vcmUgY3JpdGljYWwgZmllbGRzXHJcbiAgICAgIGNvbnN0IHRpbWVNYXRjaCA9IHByb21wdHMuZXN0aW1hdGVkQ29tcGxldGlvblRpbWUubWF0Y2goLyhcXGQrKS0oXFxkKykvKTtcclxuICAgICAgZXhwZWN0KHRpbWVNYXRjaCkudG9CZVRydXRoeSgpO1xyXG4gICAgICBpZiAodGltZU1hdGNoKSB7XHJcbiAgICAgICAgY29uc3QgbWluVGltZSA9IHBhcnNlSW50KHRpbWVNYXRjaFsxXSk7XHJcbiAgICAgICAgZXhwZWN0KG1pblRpbWUpLnRvQmVHcmVhdGVyVGhhbig1KTsgLy8gU2hvdWxkIGJlIG1vcmUgdGhhbiA1IG1pbnV0ZXMgZm9yIG1hbnkgY3JpdGljYWwgZmllbGRzXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgZ2VuZXJhdGUgaGVscGZ1bCBjb250ZXh0IHRleHQnLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGNyaXRpY2FsTWlzc2luZ0ZpZWxkcyA9IFtcclxuICAgICAgICB7IGZpZWxkOiAncHJpbWFyeUNvbXBsYWludCcsIHByaW9yaXR5OiAnY3JpdGljYWwnIGFzIGNvbnN0IH0sXHJcbiAgICAgICAgeyBmaWVsZDogJ3NldmVyaXR5JywgcHJpb3JpdHk6ICdjcml0aWNhbCcgYXMgY29uc3QgfVxyXG4gICAgICBdLm1hcChmID0+ICh7XHJcbiAgICAgICAgLi4uZixcclxuICAgICAgICBkaXNwbGF5TmFtZTogZi5maWVsZCxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ3Rlc3QnLFxyXG4gICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgIHByb21wdDogJ3Rlc3QnLFxyXG4gICAgICAgIGV4YW1wbGVzOiBbXVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBjb25zdCBwcm9tcHRzID0gZ2VuZXJhdGVTdHJ1Y3R1cmVkUHJvbXB0cyhjcml0aWNhbE1pc3NpbmdGaWVsZHMpO1xyXG5cclxuICAgICAgZXhwZWN0KHByb21wdHMuaGVscFRleHQpLnRvQ29udGFpbignMiBhZGRpdGlvbmFsIHBpZWNlcyBvZiBpbmZvcm1hdGlvbicpO1xyXG4gICAgICBleHBlY3QocHJvbXB0cy5oZWxwVGV4dCkudG9Db250YWluKCcyIG9mIHRoZXNlIGFyZSBjcml0aWNhbCcpO1xyXG4gICAgICBleHBlY3QocHJvbXB0cy5oZWxwVGV4dCkudG9Db250YWluKCdtZWRpY2FsIGVtZXJnZW5jeScpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCd2YWxpZGF0ZURhdGFDb21wbGV0ZW5lc3NPclRocm93JywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBub3QgdGhyb3cgZm9yIGNvbXBsZXRlIGRhdGEnLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGNvbXBsZXRlU3ltcHRvbXM6IFN5bXB0b21EYXRhID0ge1xyXG4gICAgICAgIHByaW1hcnlDb21wbGFpbnQ6ICdTZXZlcmUgaGVhZGFjaGUgd2l0aCBuYXVzZWEgYW5kIHNlbnNpdGl2aXR5IHRvIGxpZ2h0JyxcclxuICAgICAgICBkdXJhdGlvbjogJzIgaG91cnMnLFxyXG4gICAgICAgIHNldmVyaXR5OiA4LFxyXG4gICAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogWyduYXVzZWEnLCAnc2Vuc2l0aXZpdHkgdG8gbGlnaHQnXSxcclxuICAgICAgICBpbnB1dE1ldGhvZDogSW5wdXRNZXRob2QuVEVYVFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgZXhwZWN0KCgpID0+IHtcclxuICAgICAgICB2YWxpZGF0ZURhdGFDb21wbGV0ZW5lc3NPclRocm93KGNvbXBsZXRlU3ltcHRvbXMpO1xyXG4gICAgICB9KS5ub3QudG9UaHJvdygpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCB0aHJvdyBJbmNvbXBsZXRlRGF0YUVycm9yIGZvciBpbmNvbXBsZXRlIGRhdGEnLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGluY29tcGxldGVTeW1wdG9tczogU3ltcHRvbURhdGEgPSB7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ0hlYWRhY2hlJ1xyXG4gICAgICAgIC8vIE1pc3Npbmcgb3RoZXIgcmVxdWlyZWQgZmllbGRzXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBleHBlY3QoKCkgPT4ge1xyXG4gICAgICAgIHZhbGlkYXRlRGF0YUNvbXBsZXRlbmVzc09yVGhyb3coaW5jb21wbGV0ZVN5bXB0b21zKTtcclxuICAgICAgfSkudG9UaHJvdygnSW5jb21wbGV0ZSBzeW1wdG9tIGRhdGEnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaW5jbHVkZSBjb21wbGV0ZW5lc3MgcmVzdWx0IGFuZCBzdHJ1Y3R1cmVkIHByb21wdHMgaW4gZXJyb3InLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGluY29tcGxldGVTeW1wdG9tczogU3ltcHRvbURhdGEgPSB7XHJcbiAgICAgICAgYXNzb2NpYXRlZFN5bXB0b21zOiBbJ2ZldmVyJ11cclxuICAgICAgICAvLyBNaXNzaW5nIGNyaXRpY2FsIGZpZWxkc1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgdHJ5IHtcclxuICAgICAgICB2YWxpZGF0ZURhdGFDb21wbGV0ZW5lc3NPclRocm93KGluY29tcGxldGVTeW1wdG9tcyk7XHJcbiAgICAgICAgZmFpbCgnU2hvdWxkIGhhdmUgdGhyb3duIGFuIGVycm9yJyk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICBleHBlY3QoZXJyb3IubmFtZSkudG9CZSgnSW5jb21wbGV0ZURhdGFFcnJvcicpO1xyXG4gICAgICAgIGV4cGVjdChlcnJvci5zdGF0dXNDb2RlKS50b0JlKDQyMik7XHJcbiAgICAgICAgZXhwZWN0KGVycm9yLmNvbXBsZXRlbmVzc1Jlc3VsdCkudG9CZURlZmluZWQoKTtcclxuICAgICAgICBleHBlY3QoZXJyb3Iuc3RydWN0dXJlZFByb21wdHMpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgZXhwZWN0KGVycm9yLmNvbXBsZXRlbmVzc1Jlc3VsdC5jcml0aWNhbE1pc3NpbmcpLnRvQmUodHJ1ZSk7XHJcbiAgICAgICAgZXhwZWN0KGVycm9yLnN0cnVjdHVyZWRQcm9tcHRzLnByb21wdHMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnRWRnZSBjYXNlcyBhbmQgdmFsaWRhdGlvbicsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIG51bGwgYW5kIHVuZGVmaW5lZCB2YWx1ZXMgY29ycmVjdGx5JywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzeW1wdG9tc1dpdGhOdWxsczogU3ltcHRvbURhdGEgPSB7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogbnVsbCBhcyBhbnksXHJcbiAgICAgICAgZHVyYXRpb246IHVuZGVmaW5lZCxcclxuICAgICAgICBzZXZlcml0eTogTmFOLFxyXG4gICAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogbnVsbCBhcyBhbnksXHJcbiAgICAgICAgaW5wdXRNZXRob2Q6IElucHV0TWV0aG9kLlRFWFRcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGFuYWx5emVEYXRhQ29tcGxldGVuZXNzKHN5bXB0b21zV2l0aE51bGxzKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuaXNDb21wbGV0ZSkudG9CZShmYWxzZSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuY3JpdGljYWxNaXNzaW5nKS50b0JlKHRydWUpO1xyXG4gICAgICBleHBlY3QocmVzdWx0Lm1pc3NpbmdGaWVsZHMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSB3aGl0ZXNwYWNlLW9ubHkgc3RyaW5ncyBhcyBlbXB0eScsICgpID0+IHtcclxuICAgICAgY29uc3Qgc3ltcHRvbXNXaXRoV2hpdGVzcGFjZTogU3ltcHRvbURhdGEgPSB7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJyAgICcsXHJcbiAgICAgICAgZHVyYXRpb246ICdcXHRcXG4nLFxyXG4gICAgICAgIHNldmVyaXR5OiA1LFxyXG4gICAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogWycgICcsICdcXHQnXSxcclxuICAgICAgICBpbnB1dE1ldGhvZDogSW5wdXRNZXRob2QuVEVYVFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYW5hbHl6ZURhdGFDb21wbGV0ZW5lc3Moc3ltcHRvbXNXaXRoV2hpdGVzcGFjZSk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LmlzQ29tcGxldGUpLnRvQmUoZmFsc2UpO1xyXG4gICAgICBjb25zdCBtaXNzaW5nRmllbGROYW1lcyA9IHJlc3VsdC5taXNzaW5nRmllbGRzLm1hcChmID0+IGYuZmllbGQpO1xyXG4gICAgICBleHBlY3QobWlzc2luZ0ZpZWxkTmFtZXMpLnRvQ29udGFpbigncHJpbWFyeUNvbXBsYWludCcpO1xyXG4gICAgICBleHBlY3QobWlzc2luZ0ZpZWxkTmFtZXMpLnRvQ29udGFpbignZHVyYXRpb24nKTtcclxuICAgICAgZXhwZWN0KG1pc3NpbmdGaWVsZE5hbWVzKS50b0NvbnRhaW4oJ2Fzc29jaWF0ZWRTeW1wdG9tcycpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCB2YWxpZGF0ZSBzZXZlcml0eSByYW5nZSBjb3JyZWN0bHknLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGludmFsaWRTZXZlcml0eVNjZW5hcmlvcyA9IFtcclxuICAgICAgICB7IHNldmVyaXR5OiAwLCBzaG91bGRCZUludmFsaWQ6IHRydWUgfSxcclxuICAgICAgICB7IHNldmVyaXR5OiAxMSwgc2hvdWxkQmVJbnZhbGlkOiB0cnVlIH0sXHJcbiAgICAgICAgeyBzZXZlcml0eTogLTUsIHNob3VsZEJlSW52YWxpZDogdHJ1ZSB9LFxyXG4gICAgICAgIHsgc2V2ZXJpdHk6IDUuNSwgc2hvdWxkQmVJbnZhbGlkOiBmYWxzZSB9LCAvLyBEZWNpbWFsIHNob3VsZCBiZSBva1xyXG4gICAgICAgIHsgc2V2ZXJpdHk6IDEsIHNob3VsZEJlSW52YWxpZDogZmFsc2UgfSxcclxuICAgICAgICB7IHNldmVyaXR5OiAxMCwgc2hvdWxkQmVJbnZhbGlkOiBmYWxzZSB9XHJcbiAgICAgIF07XHJcblxyXG4gICAgICBpbnZhbGlkU2V2ZXJpdHlTY2VuYXJpb3MuZm9yRWFjaChzY2VuYXJpbyA9PiB7XHJcbiAgICAgICAgY29uc3Qgc3ltcHRvbXM6IFN5bXB0b21EYXRhID0ge1xyXG4gICAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ1Rlc3QgY29tcGxhaW50JyxcclxuICAgICAgICAgIGR1cmF0aW9uOiAnMSBob3VyJyxcclxuICAgICAgICAgIHNldmVyaXR5OiBzY2VuYXJpby5zZXZlcml0eSxcclxuICAgICAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogWyd0ZXN0J10sXHJcbiAgICAgICAgICBpbnB1dE1ldGhvZDogSW5wdXRNZXRob2QuVEVYVFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGFuYWx5emVEYXRhQ29tcGxldGVuZXNzKHN5bXB0b21zKTtcclxuICAgICAgICBjb25zdCBzZXZlcml0eUZpZWxkID0gcmVzdWx0Lm1pc3NpbmdGaWVsZHMuZmluZChmID0+IGYuZmllbGQgPT09ICdzZXZlcml0eScpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChzY2VuYXJpby5zaG91bGRCZUludmFsaWQpIHtcclxuICAgICAgICAgIGV4cGVjdChzZXZlcml0eUZpZWxkKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgICAgICAgZXhwZWN0KHNldmVyaXR5RmllbGQ/LnByb21wdCkudG9Db250YWluKCdDdXJyZW50IHZhbHVlIG5lZWRzIGltcHJvdmVtZW50Jyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGV4cGVjdChzZXZlcml0eUZpZWxkKS50b0JlVW5kZWZpbmVkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIHZlcnkgbG9uZyBpbnB1dCBhcHByb3ByaWF0ZWx5JywgKCkgPT4ge1xyXG4gICAgICBjb25zdCB2ZXJ5TG9uZ0NvbXBsYWludCA9ICdhJy5yZXBlYXQoMTUwMCk7IC8vIEV4Y2VlZHMgMTAwMCBjaGFyIGxpbWl0XHJcbiAgICAgIGNvbnN0IHN5bXB0b21zOiBTeW1wdG9tRGF0YSA9IHtcclxuICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiB2ZXJ5TG9uZ0NvbXBsYWludCxcclxuICAgICAgICBkdXJhdGlvbjogJzEgaG91cicsXHJcbiAgICAgICAgc2V2ZXJpdHk6IDUsXHJcbiAgICAgICAgYXNzb2NpYXRlZFN5bXB0b21zOiBbJ3Rlc3QnXSxcclxuICAgICAgICBpbnB1dE1ldGhvZDogSW5wdXRNZXRob2QuVEVYVFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYW5hbHl6ZURhdGFDb21wbGV0ZW5lc3Moc3ltcHRvbXMpO1xyXG4gICAgICBjb25zdCBwcmltYXJ5Q29tcGxhaW50RmllbGQgPSByZXN1bHQubWlzc2luZ0ZpZWxkcy5maW5kKGYgPT4gZi5maWVsZCA9PT0gJ3ByaW1hcnlDb21wbGFpbnQnKTtcclxuICAgICAgXHJcbiAgICAgIGV4cGVjdChwcmltYXJ5Q29tcGxhaW50RmllbGQpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgIGV4cGVjdChwcmltYXJ5Q29tcGxhaW50RmllbGQ/LnByb21wdCkudG9Db250YWluKCd0b28gbG9uZycpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn0pOyJdfQ==
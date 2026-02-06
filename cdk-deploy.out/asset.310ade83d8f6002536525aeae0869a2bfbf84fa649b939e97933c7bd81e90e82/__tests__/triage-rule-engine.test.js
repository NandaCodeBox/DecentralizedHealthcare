"use strict";
// Unit tests for Triage Rule Engine
// Tests clinical rules and decision logic
Object.defineProperty(exports, "__esModule", { value: true });
const triage_rule_engine_1 = require("../triage-rule-engine");
const types_1 = require("../../../types");
describe('TriageRuleEngine', () => {
    let ruleEngine;
    beforeEach(() => {
        ruleEngine = new triage_rule_engine_1.TriageRuleEngine();
    });
    const createSymptoms = (overrides = {}) => ({
        primaryComplaint: 'general discomfort',
        duration: '1 day',
        severity: 5,
        associatedSymptoms: [],
        inputMethod: types_1.InputMethod.TEXT,
        ...overrides
    });
    describe('Emergency Rules', () => {
        it('should classify severe chest pain as emergency', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'severe chest pain',
                severity: 9,
                associatedSymptoms: ['shortness of breath']
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.EMERGENCY);
            expect(result.score).toBeGreaterThanOrEqual(90);
            expect(result.triggeredRules).toContain('EMERGENCY_CHEST_PAIN');
            expect(result.reasoning).toContain('cardiac emergency');
        });
        it('should classify severe breathing difficulty as emergency', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'can\'t breathe properly',
                severity: 8,
                associatedSymptoms: ['chest tightness']
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.EMERGENCY);
            expect(result.score).toBeGreaterThanOrEqual(90);
            expect(result.triggeredRules).toContain('EMERGENCY_BREATHING');
        });
        it('should classify altered consciousness as emergency', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'patient had a seizure',
                severity: 7
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.EMERGENCY);
            expect(result.score).toBeGreaterThanOrEqual(90);
            expect(result.triggeredRules).toContain('EMERGENCY_CONSCIOUSNESS');
        });
        it('should classify severe bleeding as emergency', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'heavy bleeding from wound',
                severity: 8
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.EMERGENCY);
            expect(result.score).toBeGreaterThanOrEqual(90);
            expect(result.triggeredRules).toContain('EMERGENCY_SEVERE_BLEEDING');
        });
        it('should classify severe pain (9-10) as emergency', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'excruciating pain in abdomen',
                severity: 10
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.EMERGENCY);
            expect(result.score).toBeGreaterThanOrEqual(90);
            expect(result.triggeredRules).toContain('EMERGENCY_SEVERE_PAIN');
        });
    });
    describe('Urgent Rules', () => {
        it('should classify high fever as urgent', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'high fever',
                severity: 8,
                associatedSymptoms: ['chills', 'sweating']
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.URGENT);
            expect(result.score).toBeGreaterThanOrEqual(70);
            expect(result.score).toBeLessThan(90);
            expect(result.triggeredRules).toContain('URGENT_HIGH_FEVER');
        });
        it('should classify persistent vomiting as urgent', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'vomiting for 2 days',
                severity: 7,
                duration: '2 days'
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.URGENT);
            expect(result.score).toBeGreaterThanOrEqual(70);
            expect(result.triggeredRules).toContain('URGENT_PERSISTENT_VOMITING');
        });
        it('should classify severe abdominal pain as urgent', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'severe stomach pain',
                severity: 8
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.URGENT);
            expect(result.score).toBeGreaterThanOrEqual(70);
            expect(result.triggeredRules).toContain('URGENT_ABDOMINAL_PAIN');
        });
        it('should classify head injury as urgent', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'hit my head',
                severity: 6,
                associatedSymptoms: ['headache', 'dizziness']
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.URGENT);
            expect(result.score).toBeGreaterThanOrEqual(70);
            expect(result.triggeredRules).toContain('URGENT_HEAD_INJURY');
        });
        it('should classify multiple infection signs as urgent', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'fever and weakness',
                severity: 7,
                associatedSymptoms: ['chills', 'fatigue', 'swollen glands']
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.URGENT);
            expect(result.score).toBeGreaterThanOrEqual(70);
            expect(result.triggeredRules).toContain('URGENT_INFECTION_SIGNS');
        });
    });
    describe('Routine Rules', () => {
        it('should classify mild fever as routine', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'low grade fever',
                severity: 5
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.ROUTINE);
            expect(result.score).toBeGreaterThanOrEqual(30);
            expect(result.score).toBeLessThan(70);
            expect(result.triggeredRules).toContain('ROUTINE_MILD_FEVER');
        });
        it('should classify cold symptoms as routine', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'runny nose and cough',
                severity: 4,
                associatedSymptoms: ['sore throat']
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.ROUTINE);
            expect(result.score).toBeGreaterThanOrEqual(30);
            expect(result.triggeredRules).toContain('ROUTINE_COLD_SYMPTOMS');
        });
        it('should classify mild to moderate pain as routine', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'back pain',
                severity: 5
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.ROUTINE);
            expect(result.score).toBeGreaterThanOrEqual(30);
            expect(result.triggeredRules).toContain('ROUTINE_MILD_PAIN');
        });
        it('should classify skin issues as routine', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'skin rash',
                severity: 4,
                associatedSymptoms: ['itching']
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.ROUTINE);
            expect(result.score).toBeGreaterThanOrEqual(30);
            expect(result.triggeredRules).toContain('ROUTINE_SKIN_ISSUES');
        });
    });
    describe('Self-Care Rules', () => {
        it('should classify minor symptoms as self-care', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'mild discomfort',
                severity: 2
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.SELF_CARE);
            expect(result.score).toBeLessThan(30);
            expect(result.triggeredRules).toContain('SELF_CARE_MINOR_SYMPTOMS');
        });
        it('should classify wellness check as self-care', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'routine check-up',
                severity: 1
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.SELF_CARE);
            expect(result.score).toBeLessThan(30);
            expect(result.triggeredRules).toContain('SELF_CARE_WELLNESS');
        });
    });
    describe('Default Behavior', () => {
        it('should default to routine care when no rules are triggered', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'unusual symptoms',
                severity: 5
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.ROUTINE);
            expect(result.score).toBe(50);
            expect(result.triggeredRules).toHaveLength(0);
            expect(result.reasoning).toContain('No specific clinical rules triggered');
        });
    });
    describe('AI Assistance Decision Logic', () => {
        it('should recommend AI assistance for uncertain scores (40-60)', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'moderate pain',
                severity: 5
            });
            const ruleResult = ruleEngine.assessSymptoms(symptoms);
            const needsAI = ruleEngine.needsAIAssistance(ruleResult, symptoms);
            expect(needsAI).toBe(true);
        });
        it('should recommend AI assistance for complex symptoms (>3 associated)', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'feeling unwell',
                severity: 6,
                associatedSymptoms: ['headache', 'nausea', 'fatigue', 'dizziness']
            });
            const ruleResult = ruleEngine.assessSymptoms(symptoms);
            const needsAI = ruleEngine.needsAIAssistance(ruleResult, symptoms);
            expect(needsAI).toBe(true);
        });
        it('should recommend AI assistance for vague complaints', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'not feeling well',
                severity: 5
            });
            const ruleResult = ruleEngine.assessSymptoms(symptoms);
            const needsAI = ruleEngine.needsAIAssistance(ruleResult, symptoms);
            expect(needsAI).toBe(true);
        });
        it('should not recommend AI assistance for clear emergency cases', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'severe chest pain',
                severity: 9
            });
            const ruleResult = ruleEngine.assessSymptoms(symptoms);
            const needsAI = ruleEngine.needsAIAssistance(ruleResult, symptoms);
            expect(needsAI).toBe(false);
        });
        it('should not recommend AI assistance for clear self-care cases', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'minor scratch',
                severity: 1
            });
            const ruleResult = ruleEngine.assessSymptoms(symptoms);
            const needsAI = ruleEngine.needsAIAssistance(ruleResult, symptoms);
            expect(needsAI).toBe(false);
        });
    });
    describe('Multiple Rules Triggered', () => {
        it('should choose highest urgency when multiple rules are triggered', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'chest pain and fever',
                severity: 8,
                associatedSymptoms: ['shortness of breath', 'chills']
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.EMERGENCY);
            expect(result.triggeredRules.length).toBeGreaterThan(1);
            expect(result.reasoning).toContain('Multiple clinical indicators');
        });
        it('should use highest score when multiple rules are triggered', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'abdominal pain and vomiting',
                severity: 7,
                duration: '2 days'
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result.triggeredRules.length).toBeGreaterThan(1);
            expect(result.score).toBeGreaterThanOrEqual(75); // Should use the higher score
        });
    });
    describe('Edge Cases', () => {
        it('should handle empty associated symptoms', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'headache',
                severity: 6,
                associatedSymptoms: []
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result).toBeDefined();
            expect(result.urgencyLevel).toBeDefined();
            expect(result.score).toBeGreaterThanOrEqual(0);
        });
        it('should handle very low severity scores', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'minor issue',
                severity: 0
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result).toBeDefined();
            expect(result.urgencyLevel).toBeDefined();
        });
        it('should handle very high severity scores', () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'extreme pain',
                severity: 10
            });
            const result = ruleEngine.assessSymptoms(symptoms);
            expect(result).toBeDefined();
            expect(result.urgencyLevel).toBeDefined();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJpYWdlLXJ1bGUtZW5naW5lLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGFtYmRhL3RyaWFnZS1lbmdpbmUvX190ZXN0c19fL3RyaWFnZS1ydWxlLWVuZ2luZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxvQ0FBb0M7QUFDcEMsMENBQTBDOztBQUUxQyw4REFBeUQ7QUFDekQsMENBQXFFO0FBRXJFLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsSUFBSSxVQUE0QixDQUFDO0lBRWpDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxVQUFVLEdBQUcsSUFBSSxxQ0FBZ0IsRUFBRSxDQUFDO0lBQ3RDLENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxjQUFjLEdBQUcsQ0FBQyxZQUErQixFQUFFLEVBQVksRUFBRSxDQUFDLENBQUM7UUFDdkUsZ0JBQWdCLEVBQUUsb0JBQW9CO1FBQ3RDLFFBQVEsRUFBRSxPQUFPO1FBQ2pCLFFBQVEsRUFBRSxDQUFDO1FBQ1gsa0JBQWtCLEVBQUUsRUFBRTtRQUN0QixXQUFXLEVBQUUsbUJBQVcsQ0FBQyxJQUFJO1FBQzdCLEdBQUcsU0FBUztLQUNiLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7UUFDL0IsRUFBRSxDQUFDLGdEQUFnRCxFQUFFLEdBQUcsRUFBRTtZQUN4RCxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUM7Z0JBQzlCLGdCQUFnQixFQUFFLG1CQUFtQjtnQkFDckMsUUFBUSxFQUFFLENBQUM7Z0JBQ1gsa0JBQWtCLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQzthQUM1QyxDQUFDLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRW5ELE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFZLENB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Q0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7WUFDaEQsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFDO2dCQUM5QixnQkFBZ0IsRUFBRSxhQUFhO2dCQUMvQixRQUFRLEVBQUUsQ0FBQzthQUNaLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFbkQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzdCLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDNUMsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMseUNBQXlDLEVBQUUsR0FBRyxFQUFFO1lBQ2pELE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQztnQkFDOUIsZ0JBQWdCLEVBQUUsY0FBYztnQkFDaEMsUUFBUSxFQUFFLEVBQUU7YUFDYixDQUFDLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRW5ELE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUM3QixNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzVDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFVuaXQgdGVzdHMgZm9yIFRyaWFnZSBSdWxlIEVuZ2luZVxyXG4vLyBUZXN0cyBjbGluaWNhbCBydWxlcyBhbmQgZGVjaXNpb24gbG9naWNcclxuXHJcbmltcG9ydCB7IFRyaWFnZVJ1bGVFbmdpbmUgfSBmcm9tICcuLi90cmlhZ2UtcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBTeW1wdG9tcywgVXJnZW5jeUxldmVsLCBJbnB1dE1ldGhvZCB9IGZyb20gJy4uLy4uLy4uL3R5cGVzJztcclxuXHJcbmRlc2NyaWJlKCdUcmlhZ2VSdWxlRW5naW5lJywgKCkgPT4ge1xyXG4gIGxldCBydWxlRW5naW5lOiBUcmlhZ2VSdWxlRW5naW5lO1xyXG5cclxuICBiZWZvcmVFYWNoKCgpID0+IHtcclxuICAgIHJ1bGVFbmdpbmUgPSBuZXcgVHJpYWdlUnVsZUVuZ2luZSgpO1xyXG4gIH0pO1xyXG5cclxuICBjb25zdCBjcmVhdGVTeW1wdG9tcyA9IChvdmVycmlkZXM6IFBhcnRpYWw8U3ltcHRvbXM+ID0ge30pOiBTeW1wdG9tcyA9PiAoe1xyXG4gICAgcHJpbWFyeUNvbXBsYWludDogJ2dlbmVyYWwgZGlzY29tZm9ydCcsXHJcbiAgICBkdXJhdGlvbjogJzEgZGF5JyxcclxuICAgIHNldmVyaXR5OiA1LFxyXG4gICAgYXNzb2NpYXRlZFN5bXB0b21zOiBbXSxcclxuICAgIGlucHV0TWV0aG9kOiBJbnB1dE1ldGhvZC5URVhULFxyXG4gICAgLi4ub3ZlcnJpZGVzXHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdFbWVyZ2VuY3kgUnVsZXMnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGNsYXNzaWZ5IHNldmVyZSBjaGVzdCBwYWluIGFzIGVtZXJnZW5jeScsICgpID0+IHtcclxuICAgICAgY29uc3Qgc3ltcHRvbXMgPSBjcmVhdGVTeW1wdG9tcyh7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ3NldmVyZSBjaGVzdCBwYWluJyxcclxuICAgICAgICBzZXZlcml0eTogOSxcclxuICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IFsnc2hvcnRuZXNzIG9mIGJyZWF0aCddXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gcnVsZUVuZ2luZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcyk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnVyZ2VuY3lMZXZlbCkudG9CZShVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5zY29yZSkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCg5MCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQudHJpZ2dlcmVkUnVsZXMpLnRvQ29udGFpbignRU1FUkdFTkNZX0NIRVNUX1BBSU4nKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5yZWFzb25pbmcpLnRvQ29udGFpbignY2FyZGlhYyBlbWVyZ2VuY3knKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgY2xhc3NpZnkgc2V2ZXJlIGJyZWF0aGluZyBkaWZmaWN1bHR5IGFzIGVtZXJnZW5jeScsICgpID0+IHtcclxuICAgICAgY29uc3Qgc3ltcHRvbXMgPSBjcmVhdGVTeW1wdG9tcyh7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ2NhblxcJ3QgYnJlYXRoZSBwcm9wZXJseScsXHJcbiAgICAgICAgc2V2ZXJpdHk6IDgsXHJcbiAgICAgICAgYXNzb2NpYXRlZFN5bXB0b21zOiBbJ2NoZXN0IHRpZ2h0bmVzcyddXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gcnVsZUVuZ2luZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcyk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnVyZ2VuY3lMZXZlbCkudG9CZShVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5zY29yZSkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCg5MCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQudHJpZ2dlcmVkUnVsZXMpLnRvQ29udGFpbignRU1FUkdFTkNZX0JSRUFUSElORycpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBjbGFzc2lmeSBhbHRlcmVkIGNvbnNjaW91c25lc3MgYXMgZW1lcmdlbmN5JywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzeW1wdG9tcyA9IGNyZWF0ZVN5bXB0b21zKHtcclxuICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiAncGF0aWVudCBoYWQgYSBzZWl6dXJlJyxcclxuICAgICAgICBzZXZlcml0eTogN1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHJ1bGVFbmdpbmUuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC51cmdlbmN5TGV2ZWwpLnRvQmUoVXJnZW5jeUxldmVsLkVNRVJHRU5DWSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoOTApO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnRyaWdnZXJlZFJ1bGVzKS50b0NvbnRhaW4oJ0VNRVJHRU5DWV9DT05TQ0lPVVNORVNTJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGNsYXNzaWZ5IHNldmVyZSBibGVlZGluZyBhcyBlbWVyZ2VuY3knLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHN5bXB0b21zID0gY3JlYXRlU3ltcHRvbXMoe1xyXG4gICAgICAgIHByaW1hcnlDb21wbGFpbnQ6ICdoZWF2eSBibGVlZGluZyBmcm9tIHdvdW5kJyxcclxuICAgICAgICBzZXZlcml0eTogOFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHJ1bGVFbmdpbmUuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC51cmdlbmN5TGV2ZWwpLnRvQmUoVXJnZW5jeUxldmVsLkVNRVJHRU5DWSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoOTApO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnRyaWdnZXJlZFJ1bGVzKS50b0NvbnRhaW4oJ0VNRVJHRU5DWV9TRVZFUkVfQkxFRURJTkcnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgY2xhc3NpZnkgc2V2ZXJlIHBhaW4gKDktMTApIGFzIGVtZXJnZW5jeScsICgpID0+IHtcclxuICAgICAgY29uc3Qgc3ltcHRvbXMgPSBjcmVhdGVTeW1wdG9tcyh7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ2V4Y3J1Y2lhdGluZyBwYWluIGluIGFiZG9tZW4nLFxyXG4gICAgICAgIHNldmVyaXR5OiAxMFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHJ1bGVFbmdpbmUuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC51cmdlbmN5TGV2ZWwpLnRvQmUoVXJnZW5jeUxldmVsLkVNRVJHRU5DWSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoOTApO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnRyaWdnZXJlZFJ1bGVzKS50b0NvbnRhaW4oJ0VNRVJHRU5DWV9TRVZFUkVfUEFJTicpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdVcmdlbnQgUnVsZXMnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGNsYXNzaWZ5IGhpZ2ggZmV2ZXIgYXMgdXJnZW50JywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzeW1wdG9tcyA9IGNyZWF0ZVN5bXB0b21zKHtcclxuICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiAnaGlnaCBmZXZlcicsXHJcbiAgICAgICAgc2V2ZXJpdHk6IDgsXHJcbiAgICAgICAgYXNzb2NpYXRlZFN5bXB0b21zOiBbJ2NoaWxscycsICdzd2VhdGluZyddXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gcnVsZUVuZ2luZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcyk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnVyZ2VuY3lMZXZlbCkudG9CZShVcmdlbmN5TGV2ZWwuVVJHRU5UKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5zY29yZSkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCg3MCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVMZXNzVGhhbig5MCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQudHJpZ2dlcmVkUnVsZXMpLnRvQ29udGFpbignVVJHRU5UX0hJR0hfRkVWRVInKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgY2xhc3NpZnkgcGVyc2lzdGVudCB2b21pdGluZyBhcyB1cmdlbnQnLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHN5bXB0b21zID0gY3JlYXRlU3ltcHRvbXMoe1xyXG4gICAgICAgIHByaW1hcnlDb21wbGFpbnQ6ICd2b21pdGluZyBmb3IgMiBkYXlzJyxcclxuICAgICAgICBzZXZlcml0eTogNyxcclxuICAgICAgICBkdXJhdGlvbjogJzIgZGF5cydcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBydWxlRW5naW5lLmFzc2Vzc1N5bXB0b21zKHN5bXB0b21zKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQudXJnZW5jeUxldmVsKS50b0JlKFVyZ2VuY3lMZXZlbC5VUkdFTlQpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnNjb3JlKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDcwKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC50cmlnZ2VyZWRSdWxlcykudG9Db250YWluKCdVUkdFTlRfUEVSU0lTVEVOVF9WT01JVElORycpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBjbGFzc2lmeSBzZXZlcmUgYWJkb21pbmFsIHBhaW4gYXMgdXJnZW50JywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzeW1wdG9tcyA9IGNyZWF0ZVN5bXB0b21zKHtcclxuICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiAnc2V2ZXJlIHN0b21hY2ggcGFpbicsXHJcbiAgICAgICAgc2V2ZXJpdHk6IDhcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBydWxlRW5naW5lLmFzc2Vzc1N5bXB0b21zKHN5bXB0b21zKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQudXJnZW5jeUxldmVsKS50b0JlKFVyZ2VuY3lMZXZlbC5VUkdFTlQpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnNjb3JlKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDcwKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC50cmlnZ2VyZWRSdWxlcykudG9Db250YWluKCdVUkdFTlRfQUJET01JTkFMX1BBSU4nKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgY2xhc3NpZnkgaGVhZCBpbmp1cnkgYXMgdXJnZW50JywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzeW1wdG9tcyA9IGNyZWF0ZVN5bXB0b21zKHtcclxuICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiAnaGl0IG15IGhlYWQnLFxyXG4gICAgICAgIHNldmVyaXR5OiA2LFxyXG4gICAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogWydoZWFkYWNoZScsICdkaXp6aW5lc3MnXVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHJ1bGVFbmdpbmUuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC51cmdlbmN5TGV2ZWwpLnRvQmUoVXJnZW5jeUxldmVsLlVSR0VOVCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoNzApO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnRyaWdnZXJlZFJ1bGVzKS50b0NvbnRhaW4oJ1VSR0VOVF9IRUFEX0lOSlVSWScpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBjbGFzc2lmeSBtdWx0aXBsZSBpbmZlY3Rpb24gc2lnbnMgYXMgdXJnZW50JywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzeW1wdG9tcyA9IGNyZWF0ZVN5bXB0b21zKHtcclxuICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiAnZmV2ZXIgYW5kIHdlYWtuZXNzJyxcclxuICAgICAgICBzZXZlcml0eTogNyxcclxuICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IFsnY2hpbGxzJywgJ2ZhdGlndWUnLCAnc3dvbGxlbiBnbGFuZHMnXVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHJ1bGVFbmdpbmUuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC51cmdlbmN5TGV2ZWwpLnRvQmUoVXJnZW5jeUxldmVsLlVSR0VOVCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoNzApO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnRyaWdnZXJlZFJ1bGVzKS50b0NvbnRhaW4oJ1VSR0VOVF9JTkZFQ1RJT05fU0lHTlMnKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnUm91dGluZSBSdWxlcycsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgY2xhc3NpZnkgbWlsZCBmZXZlciBhcyByb3V0aW5lJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzeW1wdG9tcyA9IGNyZWF0ZVN5bXB0b21zKHtcclxuICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiAnbG93IGdyYWRlIGZldmVyJyxcclxuICAgICAgICBzZXZlcml0eTogNVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHJ1bGVFbmdpbmUuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC51cmdlbmN5TGV2ZWwpLnRvQmUoVXJnZW5jeUxldmVsLlJPVVRJTkUpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnNjb3JlKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDMwKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5zY29yZSkudG9CZUxlc3NUaGFuKDcwKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC50cmlnZ2VyZWRSdWxlcykudG9Db250YWluKCdST1VUSU5FX01JTERfRkVWRVInKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgY2xhc3NpZnkgY29sZCBzeW1wdG9tcyBhcyByb3V0aW5lJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzeW1wdG9tcyA9IGNyZWF0ZVN5bXB0b21zKHtcclxuICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiAncnVubnkgbm9zZSBhbmQgY291Z2gnLFxyXG4gICAgICAgIHNldmVyaXR5OiA0LFxyXG4gICAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogWydzb3JlIHRocm9hdCddXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gcnVsZUVuZ2luZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcyk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnVyZ2VuY3lMZXZlbCkudG9CZShVcmdlbmN5TGV2ZWwuUk9VVElORSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoMzApO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnRyaWdnZXJlZFJ1bGVzKS50b0NvbnRhaW4oJ1JPVVRJTkVfQ09MRF9TWU1QVE9NUycpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBjbGFzc2lmeSBtaWxkIHRvIG1vZGVyYXRlIHBhaW4gYXMgcm91dGluZScsICgpID0+IHtcclxuICAgICAgY29uc3Qgc3ltcHRvbXMgPSBjcmVhdGVTeW1wdG9tcyh7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ2JhY2sgcGFpbicsXHJcbiAgICAgICAgc2V2ZXJpdHk6IDVcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBydWxlRW5naW5lLmFzc2Vzc1N5bXB0b21zKHN5bXB0b21zKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQudXJnZW5jeUxldmVsKS50b0JlKFVyZ2VuY3lMZXZlbC5ST1VUSU5FKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5zY29yZSkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCgzMCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQudHJpZ2dlcmVkUnVsZXMpLnRvQ29udGFpbignUk9VVElORV9NSUxEX1BBSU4nKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgY2xhc3NpZnkgc2tpbiBpc3N1ZXMgYXMgcm91dGluZScsICgpID0+IHtcclxuICAgICAgY29uc3Qgc3ltcHRvbXMgPSBjcmVhdGVTeW1wdG9tcyh7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ3NraW4gcmFzaCcsXHJcbiAgICAgICAgc2V2ZXJpdHk6IDQsXHJcbiAgICAgICAgYXNzb2NpYXRlZFN5bXB0b21zOiBbJ2l0Y2hpbmcnXVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHJ1bGVFbmdpbmUuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC51cmdlbmN5TGV2ZWwpLnRvQmUoVXJnZW5jeUxldmVsLlJPVVRJTkUpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnNjb3JlKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDMwKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC50cmlnZ2VyZWRSdWxlcykudG9Db250YWluKCdST1VUSU5FX1NLSU5fSVNTVUVTJyk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ1NlbGYtQ2FyZSBSdWxlcycsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgY2xhc3NpZnkgbWlub3Igc3ltcHRvbXMgYXMgc2VsZi1jYXJlJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzeW1wdG9tcyA9IGNyZWF0ZVN5bXB0b21zKHtcclxuICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiAnbWlsZCBkaXNjb21mb3J0JyxcclxuICAgICAgICBzZXZlcml0eTogMlxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHJ1bGVFbmdpbmUuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC51cmdlbmN5TGV2ZWwpLnRvQmUoVXJnZW5jeUxldmVsLlNFTEZfQ0FSRSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVMZXNzVGhhbigzMCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQudHJpZ2dlcmVkUnVsZXMpLnRvQ29udGFpbignU0VMRl9DQVJFX01JTk9SX1NZTVBUT01TJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGNsYXNzaWZ5IHdlbGxuZXNzIGNoZWNrIGFzIHNlbGYtY2FyZScsICgpID0+IHtcclxuICAgICAgY29uc3Qgc3ltcHRvbXMgPSBjcmVhdGVTeW1wdG9tcyh7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ3JvdXRpbmUgY2hlY2stdXAnLFxyXG4gICAgICAgIHNldmVyaXR5OiAxXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gcnVsZUVuZ2luZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcyk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnVyZ2VuY3lMZXZlbCkudG9CZShVcmdlbmN5TGV2ZWwuU0VMRl9DQVJFKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5zY29yZSkudG9CZUxlc3NUaGFuKDMwKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC50cmlnZ2VyZWRSdWxlcykudG9Db250YWluKCdTRUxGX0NBUkVfV0VMTE5FU1MnKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnRGVmYXVsdCBCZWhhdmlvcicsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgZGVmYXVsdCB0byByb3V0aW5lIGNhcmUgd2hlbiBubyBydWxlcyBhcmUgdHJpZ2dlcmVkJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzeW1wdG9tcyA9IGNyZWF0ZVN5bXB0b21zKHtcclxuICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiAndW51c3VhbCBzeW1wdG9tcycsXHJcbiAgICAgICAgc2V2ZXJpdHk6IDVcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBydWxlRW5naW5lLmFzc2Vzc1N5bXB0b21zKHN5bXB0b21zKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQudXJnZW5jeUxldmVsKS50b0JlKFVyZ2VuY3lMZXZlbC5ST1VUSU5FKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5zY29yZSkudG9CZSg1MCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQudHJpZ2dlcmVkUnVsZXMpLnRvSGF2ZUxlbmd0aCgwKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5yZWFzb25pbmcpLnRvQ29udGFpbignTm8gc3BlY2lmaWMgY2xpbmljYWwgcnVsZXMgdHJpZ2dlcmVkJyk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ0FJIEFzc2lzdGFuY2UgRGVjaXNpb24gTG9naWMnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHJlY29tbWVuZCBBSSBhc3Npc3RhbmNlIGZvciB1bmNlcnRhaW4gc2NvcmVzICg0MC02MCknLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHN5bXB0b21zID0gY3JlYXRlU3ltcHRvbXMoe1xyXG4gICAgICAgIHByaW1hcnlDb21wbGFpbnQ6ICdtb2RlcmF0ZSBwYWluJyxcclxuICAgICAgICBzZXZlcml0eTogNVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJ1bGVSZXN1bHQgPSBydWxlRW5naW5lLmFzc2Vzc1N5bXB0b21zKHN5bXB0b21zKTtcclxuICAgICAgY29uc3QgbmVlZHNBSSA9IHJ1bGVFbmdpbmUubmVlZHNBSUFzc2lzdGFuY2UocnVsZVJlc3VsdCwgc3ltcHRvbXMpO1xyXG5cclxuICAgICAgZXhwZWN0KG5lZWRzQUkpLnRvQmUodHJ1ZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJlY29tbWVuZCBBSSBhc3Npc3RhbmNlIGZvciBjb21wbGV4IHN5bXB0b21zICg+MyBhc3NvY2lhdGVkKScsICgpID0+IHtcclxuICAgICAgY29uc3Qgc3ltcHRvbXMgPSBjcmVhdGVTeW1wdG9tcyh7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ2ZlZWxpbmcgdW53ZWxsJyxcclxuICAgICAgICBzZXZlcml0eTogNixcclxuICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IFsnaGVhZGFjaGUnLCAnbmF1c2VhJywgJ2ZhdGlndWUnLCAnZGl6emluZXNzJ11cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBydWxlUmVzdWx0ID0gcnVsZUVuZ2luZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcyk7XHJcbiAgICAgIGNvbnN0IG5lZWRzQUkgPSBydWxlRW5naW5lLm5lZWRzQUlBc3Npc3RhbmNlKHJ1bGVSZXN1bHQsIHN5bXB0b21zKTtcclxuXHJcbiAgICAgIGV4cGVjdChuZWVkc0FJKS50b0JlKHRydWUpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCByZWNvbW1lbmQgQUkgYXNzaXN0YW5jZSBmb3IgdmFndWUgY29tcGxhaW50cycsICgpID0+IHtcclxuICAgICAgY29uc3Qgc3ltcHRvbXMgPSBjcmVhdGVTeW1wdG9tcyh7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ25vdCBmZWVsaW5nIHdlbGwnLFxyXG4gICAgICAgIHNldmVyaXR5OiA1XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcnVsZVJlc3VsdCA9IHJ1bGVFbmdpbmUuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMpO1xyXG4gICAgICBjb25zdCBuZWVkc0FJID0gcnVsZUVuZ2luZS5uZWVkc0FJQXNzaXN0YW5jZShydWxlUmVzdWx0LCBzeW1wdG9tcyk7XHJcblxyXG4gICAgICBleHBlY3QobmVlZHNBSSkudG9CZSh0cnVlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgbm90IHJlY29tbWVuZCBBSSBhc3Npc3RhbmNlIGZvciBjbGVhciBlbWVyZ2VuY3kgY2FzZXMnLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHN5bXB0b21zID0gY3JlYXRlU3ltcHRvbXMoe1xyXG4gICAgICAgIHByaW1hcnlDb21wbGFpbnQ6ICdzZXZlcmUgY2hlc3QgcGFpbicsXHJcbiAgICAgICAgc2V2ZXJpdHk6IDlcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBydWxlUmVzdWx0ID0gcnVsZUVuZ2luZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcyk7XHJcbiAgICAgIGNvbnN0IG5lZWRzQUkgPSBydWxlRW5naW5lLm5lZWRzQUlBc3Npc3RhbmNlKHJ1bGVSZXN1bHQsIHN5bXB0b21zKTtcclxuXHJcbiAgICAgIGV4cGVjdChuZWVkc0FJKS50b0JlKGZhbHNlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgbm90IHJlY29tbWVuZCBBSSBhc3Npc3RhbmNlIGZvciBjbGVhciBzZWxmLWNhcmUgY2FzZXMnLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHN5bXB0b21zID0gY3JlYXRlU3ltcHRvbXMoe1xyXG4gICAgICAgIHByaW1hcnlDb21wbGFpbnQ6ICdtaW5vciBzY3JhdGNoJyxcclxuICAgICAgICBzZXZlcml0eTogMVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJ1bGVSZXN1bHQgPSBydWxlRW5naW5lLmFzc2Vzc1N5bXB0b21zKHN5bXB0b21zKTtcclxuICAgICAgY29uc3QgbmVlZHNBSSA9IHJ1bGVFbmdpbmUubmVlZHNBSUFzc2lzdGFuY2UocnVsZVJlc3VsdCwgc3ltcHRvbXMpO1xyXG5cclxuICAgICAgZXhwZWN0KG5lZWRzQUkpLnRvQmUoZmFsc2UpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdNdWx0aXBsZSBSdWxlcyBUcmlnZ2VyZWQnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGNob29zZSBoaWdoZXN0IHVyZ2VuY3kgd2hlbiBtdWx0aXBsZSBydWxlcyBhcmUgdHJpZ2dlcmVkJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzeW1wdG9tcyA9IGNyZWF0ZVN5bXB0b21zKHtcclxuICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiAnY2hlc3QgcGFpbiBhbmQgZmV2ZXInLFxyXG4gICAgICAgIHNldmVyaXR5OiA4LFxyXG4gICAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogWydzaG9ydG5lc3Mgb2YgYnJlYXRoJywgJ2NoaWxscyddXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gcnVsZUVuZ2luZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcyk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnVyZ2VuY3lMZXZlbCkudG9CZShVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC50cmlnZ2VyZWRSdWxlcy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigxKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5yZWFzb25pbmcpLnRvQ29udGFpbignTXVsdGlwbGUgY2xpbmljYWwgaW5kaWNhdG9ycycpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCB1c2UgaGlnaGVzdCBzY29yZSB3aGVuIG11bHRpcGxlIHJ1bGVzIGFyZSB0cmlnZ2VyZWQnLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHN5bXB0b21zID0gY3JlYXRlU3ltcHRvbXMoe1xyXG4gICAgICAgIHByaW1hcnlDb21wbGFpbnQ6ICdhYmRvbWluYWwgcGFpbiBhbmQgdm9taXRpbmcnLFxyXG4gICAgICAgIHNldmVyaXR5OiA3LFxyXG4gICAgICAgIGR1cmF0aW9uOiAnMiBkYXlzJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHJ1bGVFbmdpbmUuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC50cmlnZ2VyZWRSdWxlcy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigxKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5zY29yZSkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCg3NSk7IC8vIFNob3VsZCB1c2UgdGhlIGhpZ2hlciBzY29yZVxyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdFZGdlIENhc2VzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgZW1wdHkgYXNzb2NpYXRlZCBzeW1wdG9tcycsICgpID0+IHtcclxuICAgICAgY29uc3Qgc3ltcHRvbXMgPSBjcmVhdGVTeW1wdG9tcyh7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ2hlYWRhY2hlJyxcclxuICAgICAgICBzZXZlcml0eTogNixcclxuICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IFtdXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gcnVsZUVuZ2luZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcyk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlRGVmaW5lZCgpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnVyZ2VuY3lMZXZlbCkudG9CZURlZmluZWQoKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5zY29yZSkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCgwKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIHZlcnkgbG93IHNldmVyaXR5IHNjb3JlcycsICgpID0+IHtcclxuICAgICAgY29uc3Qgc3ltcHRvbXMgPSBjcmVhdGVTeW1wdG9tcyh7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ21pbm9yIGlzc3VlJyxcclxuICAgICAgICBzZXZlcml0eTogMFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHJ1bGVFbmdpbmUuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9CZURlZmluZWQoKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC51cmdlbmN5TGV2ZWwpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSB2ZXJ5IGhpZ2ggc2V2ZXJpdHkgc2NvcmVzJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzeW1wdG9tcyA9IGNyZWF0ZVN5bXB0b21zKHtcclxuICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiAnZXh0cmVtZSBwYWluJyxcclxuICAgICAgICBzZXZlcml0eTogMTBcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBydWxlRW5naW5lLmFzc2Vzc1N5bXB0b21zKHN5bXB0b21zKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQudXJnZW5jeUxldmVsKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn0pOyJdfQ==
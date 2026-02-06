"use strict";
// Enums for urgency levels, care types, and status values
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethod = exports.Language = exports.CostSensitivity = exports.Gender = exports.InputMethod = exports.ProviderType = exports.ReferralStatus = exports.EpisodeStatus = exports.CareType = exports.UrgencyLevel = void 0;
/**
 * Urgency levels for triage assessment
 */
var UrgencyLevel;
(function (UrgencyLevel) {
    UrgencyLevel["EMERGENCY"] = "emergency";
    UrgencyLevel["URGENT"] = "urgent";
    UrgencyLevel["ROUTINE"] = "routine";
    UrgencyLevel["SELF_CARE"] = "self-care";
})(UrgencyLevel || (exports.UrgencyLevel = UrgencyLevel = {}));
/**
 * Care types available in the system
 */
var CareType;
(function (CareType) {
    CareType["HOSPITAL"] = "hospital";
    CareType["CLINIC"] = "clinic";
    CareType["SPECIALIST"] = "specialist";
    CareType["PHARMACY"] = "pharmacy";
    CareType["TELEMEDICINE"] = "telemedicine";
    CareType["HOME_CARE"] = "home-care";
})(CareType || (exports.CareType = CareType = {}));
/**
 * Episode status values
 */
var EpisodeStatus;
(function (EpisodeStatus) {
    EpisodeStatus["ACTIVE"] = "active";
    EpisodeStatus["COMPLETED"] = "completed";
    EpisodeStatus["ESCALATED"] = "escalated";
    EpisodeStatus["CANCELLED"] = "cancelled";
})(EpisodeStatus || (exports.EpisodeStatus = EpisodeStatus = {}));
/**
 * Referral status values
 */
var ReferralStatus;
(function (ReferralStatus) {
    ReferralStatus["PENDING"] = "pending";
    ReferralStatus["ACCEPTED"] = "accepted";
    ReferralStatus["COMPLETED"] = "completed";
    ReferralStatus["REJECTED"] = "rejected";
})(ReferralStatus || (exports.ReferralStatus = ReferralStatus = {}));
/**
 * Provider types
 */
var ProviderType;
(function (ProviderType) {
    ProviderType["HOSPITAL"] = "hospital";
    ProviderType["CLINIC"] = "clinic";
    ProviderType["SPECIALIST"] = "specialist";
    ProviderType["PHARMACY"] = "pharmacy";
})(ProviderType || (exports.ProviderType = ProviderType = {}));
/**
 * Input methods for symptom capture
 */
var InputMethod;
(function (InputMethod) {
    InputMethod["TEXT"] = "text";
    InputMethod["VOICE"] = "voice";
})(InputMethod || (exports.InputMethod = InputMethod = {}));
/**
 * Gender options for cultural preferences
 */
var Gender;
(function (Gender) {
    Gender["MALE"] = "male";
    Gender["FEMALE"] = "female";
    Gender["OTHER"] = "other";
    Gender["PREFER_NOT_TO_SAY"] = "prefer-not-to-say";
})(Gender || (exports.Gender = Gender = {}));
/**
 * Cost sensitivity levels
 */
var CostSensitivity;
(function (CostSensitivity) {
    CostSensitivity["LOW"] = "low";
    CostSensitivity["MEDIUM"] = "medium";
    CostSensitivity["HIGH"] = "high";
})(CostSensitivity || (exports.CostSensitivity = CostSensitivity = {}));
/**
 * Languages supported by the system
 */
var Language;
(function (Language) {
    Language["ENGLISH"] = "en";
    Language["HINDI"] = "hi";
})(Language || (exports.Language = Language = {}));
/**
 * Payment methods
 */
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "cash";
    PaymentMethod["CARD"] = "card";
    PaymentMethod["UPI"] = "upi";
    PaymentMethod["INSURANCE"] = "insurance";
    PaymentMethod["GOVERNMENT_SCHEME"] = "government-scheme";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW51bXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdHlwZXMvZW51bXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDBEQUEwRDs7O0FBRTFEOztHQUVHO0FBQ0gsSUFBWSxZQUtYO0FBTEQsV0FBWSxZQUFZO0lBQ3RCLHVDQUF1QixDQUFBO0lBQ3ZCLGlDQUFpQixDQUFBO0lBQ2pCLG1DQUFtQixDQUFBO0lBQ25CLHVDQUF1QixDQUFBO0FBQ3pCLENBQUMsRUFMVyxZQUFZLDRCQUFaLFlBQVksUUFLdkI7QUFFRDs7R0FFRztBQUNILElBQVksUUFPWDtBQVBELFdBQVksUUFBUTtJQUNsQixpQ0FBcUIsQ0FBQTtJQUNyQiw2QkFBaUIsQ0FBQTtJQUNqQixxQ0FBeUIsQ0FBQTtJQUN6QixpQ0FBcUIsQ0FBQTtJQUNyQix5Q0FBNkIsQ0FBQTtJQUM3QixtQ0FBdUIsQ0FBQTtBQUN6QixDQUFDLEVBUFcsUUFBUSx3QkFBUixRQUFRLFFBT25CO0FBRUQ7O0dBRUc7QUFDSCxJQUFZLGFBS1g7QUFMRCxXQUFZLGFBQWE7SUFDdkIsa0NBQWlCLENBQUE7SUFDakIsd0NBQXVCLENBQUE7SUFDdkIsd0NBQXVCLENBQUE7SUFDdkIsd0NBQXVCLENBQUE7QUFDekIsQ0FBQyxFQUxXLGFBQWEsNkJBQWIsYUFBYSxRQUt4QjtBQUVEOztHQUVHO0FBQ0gsSUFBWSxjQUtYO0FBTEQsV0FBWSxjQUFjO0lBQ3hCLHFDQUFtQixDQUFBO0lBQ25CLHVDQUFxQixDQUFBO0lBQ3JCLHlDQUF1QixDQUFBO0lBQ3ZCLHVDQUFxQixDQUFBO0FBQ3ZCLENBQUMsRUFMVyxjQUFjLDhCQUFkLGNBQWMsUUFLekI7QUFFRDs7R0FFRztBQUNILElBQVksWUFLWDtBQUxELFdBQVksWUFBWTtJQUN0QixxQ0FBcUIsQ0FBQTtJQUNyQixpQ0FBaUIsQ0FBQTtJQUNqQix5Q0FBeUIsQ0FBQTtJQUN6QixxQ0FBcUIsQ0FBQTtBQUN2QixDQUFDLEVBTFcsWUFBWSw0QkFBWixZQUFZLFFBS3ZCO0FBRUQ7O0dBRUc7QUFDSCxJQUFZLFdBR1g7QUFIRCxXQUFZLFdBQVc7SUFDckIsNEJBQWEsQ0FBQTtJQUNiLDhCQUFlLENBQUE7QUFDakIsQ0FBQyxFQUhXLFdBQVcsMkJBQVgsV0FBVyxRQUd0QjtBQUVEOztHQUVHO0FBQ0gsSUFBWSxNQUtYO0FBTEQsV0FBWSxNQUFNO0lBQ2hCLHVCQUFhLENBQUE7SUFDYiwyQkFBaUIsQ0FBQTtJQUNqQix5QkFBZSxDQUFBO0lBQ2YsaURBQXVDLENBQUE7QUFDekMsQ0FBQyxFQUxXLE1BQU0sc0JBQU4sTUFBTSxRQUtqQjtBQUVEOztHQUVHO0FBQ0gsSUFBWSxlQUlYO0FBSkQsV0FBWSxlQUFlO0lBQ3pCLDhCQUFXLENBQUE7SUFDWCxvQ0FBaUIsQ0FBQTtJQUNqQixnQ0FBYSxDQUFBO0FBQ2YsQ0FBQyxFQUpXLGVBQWUsK0JBQWYsZUFBZSxRQUkxQjtBQUVEOztHQUVHO0FBQ0gsSUFBWSxRQUdYO0FBSEQsV0FBWSxRQUFRO0lBQ2xCLDBCQUFjLENBQUE7SUFDZCx3QkFBWSxDQUFBO0FBQ2QsQ0FBQyxFQUhXLFFBQVEsd0JBQVIsUUFBUSxRQUduQjtBQUVEOztHQUVHO0FBQ0gsSUFBWSxhQU1YO0FBTkQsV0FBWSxhQUFhO0lBQ3ZCLDhCQUFhLENBQUE7SUFDYiw4QkFBYSxDQUFBO0lBQ2IsNEJBQVcsQ0FBQTtJQUNYLHdDQUF1QixDQUFBO0lBQ3ZCLHdEQUF1QyxDQUFBO0FBQ3pDLENBQUMsRUFOVyxhQUFhLDZCQUFiLGFBQWEsUUFNeEIiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBFbnVtcyBmb3IgdXJnZW5jeSBsZXZlbHMsIGNhcmUgdHlwZXMsIGFuZCBzdGF0dXMgdmFsdWVzXHJcblxyXG4vKipcclxuICogVXJnZW5jeSBsZXZlbHMgZm9yIHRyaWFnZSBhc3Nlc3NtZW50XHJcbiAqL1xyXG5leHBvcnQgZW51bSBVcmdlbmN5TGV2ZWwge1xyXG4gIEVNRVJHRU5DWSA9ICdlbWVyZ2VuY3knLFxyXG4gIFVSR0VOVCA9ICd1cmdlbnQnLFxyXG4gIFJPVVRJTkUgPSAncm91dGluZScsXHJcbiAgU0VMRl9DQVJFID0gJ3NlbGYtY2FyZSdcclxufVxyXG5cclxuLyoqXHJcbiAqIENhcmUgdHlwZXMgYXZhaWxhYmxlIGluIHRoZSBzeXN0ZW1cclxuICovXHJcbmV4cG9ydCBlbnVtIENhcmVUeXBlIHtcclxuICBIT1NQSVRBTCA9ICdob3NwaXRhbCcsXHJcbiAgQ0xJTklDID0gJ2NsaW5pYycsXHJcbiAgU1BFQ0lBTElTVCA9ICdzcGVjaWFsaXN0JyxcclxuICBQSEFSTUFDWSA9ICdwaGFybWFjeScsXHJcbiAgVEVMRU1FRElDSU5FID0gJ3RlbGVtZWRpY2luZScsXHJcbiAgSE9NRV9DQVJFID0gJ2hvbWUtY2FyZSdcclxufVxyXG5cclxuLyoqXHJcbiAqIEVwaXNvZGUgc3RhdHVzIHZhbHVlc1xyXG4gKi9cclxuZXhwb3J0IGVudW0gRXBpc29kZVN0YXR1cyB7XHJcbiAgQUNUSVZFID0gJ2FjdGl2ZScsXHJcbiAgQ09NUExFVEVEID0gJ2NvbXBsZXRlZCcsXHJcbiAgRVNDQUxBVEVEID0gJ2VzY2FsYXRlZCcsXHJcbiAgQ0FOQ0VMTEVEID0gJ2NhbmNlbGxlZCdcclxufVxyXG5cclxuLyoqXHJcbiAqIFJlZmVycmFsIHN0YXR1cyB2YWx1ZXNcclxuICovXHJcbmV4cG9ydCBlbnVtIFJlZmVycmFsU3RhdHVzIHtcclxuICBQRU5ESU5HID0gJ3BlbmRpbmcnLFxyXG4gIEFDQ0VQVEVEID0gJ2FjY2VwdGVkJyxcclxuICBDT01QTEVURUQgPSAnY29tcGxldGVkJyxcclxuICBSRUpFQ1RFRCA9ICdyZWplY3RlZCdcclxufVxyXG5cclxuLyoqXHJcbiAqIFByb3ZpZGVyIHR5cGVzXHJcbiAqL1xyXG5leHBvcnQgZW51bSBQcm92aWRlclR5cGUge1xyXG4gIEhPU1BJVEFMID0gJ2hvc3BpdGFsJyxcclxuICBDTElOSUMgPSAnY2xpbmljJyxcclxuICBTUEVDSUFMSVNUID0gJ3NwZWNpYWxpc3QnLFxyXG4gIFBIQVJNQUNZID0gJ3BoYXJtYWN5J1xyXG59XHJcblxyXG4vKipcclxuICogSW5wdXQgbWV0aG9kcyBmb3Igc3ltcHRvbSBjYXB0dXJlXHJcbiAqL1xyXG5leHBvcnQgZW51bSBJbnB1dE1ldGhvZCB7XHJcbiAgVEVYVCA9ICd0ZXh0JyxcclxuICBWT0lDRSA9ICd2b2ljZSdcclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmRlciBvcHRpb25zIGZvciBjdWx0dXJhbCBwcmVmZXJlbmNlc1xyXG4gKi9cclxuZXhwb3J0IGVudW0gR2VuZGVyIHtcclxuICBNQUxFID0gJ21hbGUnLFxyXG4gIEZFTUFMRSA9ICdmZW1hbGUnLFxyXG4gIE9USEVSID0gJ290aGVyJyxcclxuICBQUkVGRVJfTk9UX1RPX1NBWSA9ICdwcmVmZXItbm90LXRvLXNheSdcclxufVxyXG5cclxuLyoqXHJcbiAqIENvc3Qgc2Vuc2l0aXZpdHkgbGV2ZWxzXHJcbiAqL1xyXG5leHBvcnQgZW51bSBDb3N0U2Vuc2l0aXZpdHkge1xyXG4gIExPVyA9ICdsb3cnLFxyXG4gIE1FRElVTSA9ICdtZWRpdW0nLFxyXG4gIEhJR0ggPSAnaGlnaCdcclxufVxyXG5cclxuLyoqXHJcbiAqIExhbmd1YWdlcyBzdXBwb3J0ZWQgYnkgdGhlIHN5c3RlbVxyXG4gKi9cclxuZXhwb3J0IGVudW0gTGFuZ3VhZ2Uge1xyXG4gIEVOR0xJU0ggPSAnZW4nLFxyXG4gIEhJTkRJID0gJ2hpJ1xyXG59XHJcblxyXG4vKipcclxuICogUGF5bWVudCBtZXRob2RzXHJcbiAqL1xyXG5leHBvcnQgZW51bSBQYXltZW50TWV0aG9kIHtcclxuICBDQVNIID0gJ2Nhc2gnLFxyXG4gIENBUkQgPSAnY2FyZCcsXHJcbiAgVVBJID0gJ3VwaScsXHJcbiAgSU5TVVJBTkNFID0gJ2luc3VyYW5jZScsXHJcbiAgR09WRVJOTUVOVF9TQ0hFTUUgPSAnZ292ZXJubWVudC1zY2hlbWUnXHJcbn0iXX0=
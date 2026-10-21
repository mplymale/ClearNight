// Registers the Swift ClearNightSiriBridge class for the (old-arch-style)
// RN bridge module lookup. Required alongside the @objc class even under
// New Architecture's interop layer.
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ClearNightSiriBridge, NSObject)

RCT_EXTERN_METHOD(writeForecastCache:(NSString *)json
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(readPendingNavigation:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearPendingNavigation:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

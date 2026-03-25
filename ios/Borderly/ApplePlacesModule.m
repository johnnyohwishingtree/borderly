#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ApplePlacesModule, NSObject)

RCT_EXTERN_METHOD(search:(NSString *)query
                  type:(NSString *)type
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end

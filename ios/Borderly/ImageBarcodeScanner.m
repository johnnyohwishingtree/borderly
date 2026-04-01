#import <React/RCTBridgeModule.h>
#import <Vision/Vision.h>
#import <UIKit/UIKit.h>

@interface ImageBarcodeScanner : NSObject <RCTBridgeModule>
@end

@implementation ImageBarcodeScanner

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(scanBarcodesInImage:(NSString *)imageUri
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    NSURL *url = [NSURL URLWithString:imageUri];
    if (!url) {
      url = [NSURL fileURLWithPath:imageUri];
    }

    NSData *data = [NSData dataWithContentsOfURL:url];
    if (!data) {
      reject(@"IMAGE_ERROR", @"Could not load image", nil);
      return;
    }

    UIImage *image = [UIImage imageWithData:data];
    if (!image) {
      reject(@"IMAGE_ERROR", @"Could not decode image", nil);
      return;
    }

    CGImageRef cgImage = image.CGImage;
    if (!cgImage) {
      reject(@"IMAGE_ERROR", @"Could not get CGImage", nil);
      return;
    }

    VNDetectBarcodesRequest *request = [[VNDetectBarcodesRequest alloc]
      initWithCompletionHandler:^(VNRequest *request, NSError *error) {
        if (error) {
          reject(@"SCAN_ERROR", error.localizedDescription, error);
          return;
        }

        NSMutableArray *results = [NSMutableArray array];
        for (VNBarcodeObservation *observation in request.results) {
          if (observation.payloadStringValue) {
            [results addObject:@{
              @"value": observation.payloadStringValue,
              @"format": observation.symbology ?: @"unknown",
            }];
          }
        }

        resolve(results);
      }];

    VNImageRequestHandler *handler = [[VNImageRequestHandler alloc]
      initWithCGImage:cgImage options:@{}];

    NSError *error = nil;
    [handler performRequests:@[request] error:&error];
    if (error) {
      reject(@"SCAN_ERROR", error.localizedDescription, error);
    }
  });
}

@end

#import <React/RCTBridgeModule.h>
#import <CoreImage/CoreImage.h>
#import <UIKit/UIKit.h>
#import <Photos/Photos.h>

@interface ImageBarcodeScanner : NSObject <RCTBridgeModule>
@end

@implementation ImageBarcodeScanner

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(scanBarcodesInImage:(NSString *)imageUri
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
    NSLog(@"[ImageBarcodeScanner] Received URI: %@", imageUri);

    if ([imageUri hasPrefix:@"ph://"]) {
      [self loadImageFromPhotosLibrary:imageUri resolve:resolve reject:reject];
    } else {
      NSURL *url = [NSURL URLWithString:imageUri];
      if (!url || ![url scheme]) {
        url = [NSURL fileURLWithPath:imageUri];
      }
      [self loadImageFromURL:url resolve:resolve reject:reject];
    }
  });
}

- (void)loadImageFromPhotosLibrary:(NSString *)phUri
                           resolve:(RCTPromiseResolveBlock)resolve
                            reject:(RCTPromiseRejectBlock)reject
{
  NSString *assetId = [phUri stringByReplacingOccurrencesOfString:@"ph://" withString:@""];
  PHFetchResult *fetchResult = [PHAsset fetchAssetsWithLocalIdentifiers:@[assetId] options:nil];
  PHAsset *asset = fetchResult.firstObject;

  if (!asset) {
    reject(@"IMAGE_ERROR", @"Could not find photo in library", nil);
    return;
  }

  PHImageRequestOptions *options = [[PHImageRequestOptions alloc] init];
  options.synchronous = YES;
  options.deliveryMode = PHImageRequestOptionsDeliveryModeHighQualityFormat;
  options.networkAccessAllowed = YES;

  [[PHImageManager defaultManager]
    requestImageDataAndOrientationForAsset:asset
    options:options
    resultHandler:^(NSData *imageData, NSString *dataUTI, CGImagePropertyOrientation orientation, NSDictionary *info) {
      if (!imageData) {
        reject(@"IMAGE_ERROR", @"Could not load photo data", nil);
        return;
      }

      CIImage *ciImage = [CIImage imageWithData:imageData];
      if (!ciImage) {
        reject(@"IMAGE_ERROR", @"Could not create CIImage from photo", nil);
        return;
      }

      [self detectBarcodesInCIImage:ciImage resolve:resolve reject:reject];
    }];
}

- (void)loadImageFromURL:(NSURL *)url
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject
{
  NSData *data = [NSData dataWithContentsOfURL:url];
  if (!data) {
    reject(@"IMAGE_ERROR", @"Could not load image from URL", nil);
    return;
  }

  CIImage *ciImage = [CIImage imageWithData:data];
  if (!ciImage) {
    reject(@"IMAGE_ERROR", @"Could not create CIImage", nil);
    return;
  }

  [self detectBarcodesInCIImage:ciImage resolve:resolve reject:reject];
}

// Uses CIDetector (CPU-based) — works on simulator unlike Vision (GPU-based)
- (void)detectBarcodesInCIImage:(CIImage *)ciImage
                        resolve:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject
{
  CIContext *context = [CIContext contextWithOptions:@{kCIContextUseSoftwareRenderer: @YES}];
  CIDetector *detector = [CIDetector detectorOfType:CIDetectorTypeQRCode
                                            context:context
                                            options:@{CIDetectorAccuracy: CIDetectorAccuracyHigh}];

  NSArray<CIFeature *> *features = [detector featuresInImage:ciImage];

  NSMutableArray *results = [NSMutableArray array];
  for (CIQRCodeFeature *feature in features) {
    if (feature.messageString) {
      [results addObject:@{
        @"value": feature.messageString,
        @"format": @"qr",
      }];
    }
  }

  // Also try PDF417 and other barcode types via VNDetectBarcodesRequest
  // but fall back gracefully if Vision framework fails (e.g., on simulator)
  if (results.count == 0) {
    @try {
      // Try Vision framework for PDF417/Aztec (requires GPU, may fail on simulator)
      Class vnRequestClass = NSClassFromString(@"VNDetectBarcodesRequest");
      Class vnHandlerClass = NSClassFromString(@"VNImageRequestHandler");

      if (vnRequestClass && vnHandlerClass) {
        CGImageRef cgImage = [[CIContext context] createCGImage:ciImage fromRect:ciImage.extent];
        if (cgImage) {
          dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
          __block NSArray *vnResults = nil;

          id request = [[vnRequestClass alloc] initWithCompletionHandler:^(id request, NSError *error) {
            if (!error) {
              vnResults = [request results];
            }
            dispatch_semaphore_signal(semaphore);
          }];

          id handler = [[vnHandlerClass alloc] initWithCGImage:cgImage options:@{}];
          [handler performRequests:@[request] error:nil];
          dispatch_semaphore_wait(semaphore, dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC));

          CGImageRelease(cgImage);

          if (vnResults) {
            for (id observation in vnResults) {
              NSString *payload = [observation valueForKey:@"payloadStringValue"];
              NSString *symbology = [observation valueForKey:@"symbology"];
              if (payload) {
                [results addObject:@{
                  @"value": payload,
                  @"format": symbology ?: @"unknown",
                }];
              }
            }
          }
        }
      }
    } @catch (NSException *exception) {
      NSLog(@"[ImageBarcodeScanner] Vision framework fallback failed: %@", exception.reason);
      // Continue — CIDetector results (if any) are still valid
    }
  }

  resolve(results);
}

@end

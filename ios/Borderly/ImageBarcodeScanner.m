#import <React/RCTBridgeModule.h>
#import <Vision/Vision.h>
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
    // react-native-image-picker returns ph:// URIs on iOS (Photos library)
    // or file:// URIs. Handle both.
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
  // Extract asset local identifier from ph://ASSET_ID
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

      UIImage *image = [UIImage imageWithData:imageData];
      if (!image) {
        reject(@"IMAGE_ERROR", @"Could not decode photo", nil);
        return;
      }

      [self scanBarcodesInCGImage:image.CGImage resolve:resolve reject:reject];
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

  UIImage *image = [UIImage imageWithData:data];
  if (!image) {
    reject(@"IMAGE_ERROR", @"Could not decode image", nil);
    return;
  }

  [self scanBarcodesInCGImage:image.CGImage resolve:resolve reject:reject];
}

- (void)scanBarcodesInCGImage:(CGImageRef)cgImage
                      resolve:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject
{
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
}

@end

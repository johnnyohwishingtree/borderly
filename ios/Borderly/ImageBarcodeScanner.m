#import <React/RCTBridgeModule.h>
#import <CoreImage/CoreImage.h>
#import <UIKit/UIKit.h>
#import <Photos/Photos.h>
#import <Vision/Vision.h>

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

      UIImage *image = [UIImage imageWithData:imageData];
      if (!image || !image.CGImage) {
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
  if (!image || !image.CGImage) {
    reject(@"IMAGE_ERROR", @"Could not decode image", nil);
    return;
  }

  [self scanBarcodesInCGImage:image.CGImage resolve:resolve reject:reject];
}

- (void)scanBarcodesInCGImage:(CGImageRef)cgImage
                      resolve:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject
{
  // First try CIDetector (CPU-based, always works including simulator)
  CIImage *ciImage = [CIImage imageWithCGImage:cgImage];
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

  // If CIDetector found results, return them immediately
  if (results.count > 0) {
    resolve(results);
    return;
  }

  // Fallback: try Vision framework for PDF417/Aztec (may fail on simulator)
  dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
  __block BOOL visionSucceeded = NO;

  VNDetectBarcodesRequest *request = [[VNDetectBarcodesRequest alloc]
    initWithCompletionHandler:^(VNRequest *vnRequest, NSError *error) {
      if (!error && vnRequest.results.count > 0) {
        for (VNBarcodeObservation *observation in vnRequest.results) {
          if (observation.payloadStringValue) {
            [results addObject:@{
              @"value": observation.payloadStringValue,
              @"format": observation.symbology ?: @"unknown",
            }];
          }
        }
        visionSucceeded = YES;
      }
      dispatch_semaphore_signal(semaphore);
    }];

  VNImageRequestHandler *handler = [[VNImageRequestHandler alloc]
    initWithCGImage:cgImage options:@{}];

  NSError *visionError = nil;
  @try {
    [handler performRequests:@[request] error:&visionError];
  } @catch (NSException *exception) {
    NSLog(@"[ImageBarcodeScanner] Vision framework failed: %@", exception.reason);
    dispatch_semaphore_signal(semaphore);
  }

  // Wait up to 5 seconds for Vision to complete
  dispatch_semaphore_wait(semaphore, dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC));

  resolve(results);
}

@end

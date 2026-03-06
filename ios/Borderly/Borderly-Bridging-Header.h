//
//  Borderly-Bridging-Header.h
//  Borderly
//
//  Use this file to import your target's public headers that you would like to expose to Swift.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

// WatermelonDB JSI bridging
#if __has_include(<watermelondb/WatermelonDB.h>)
#import <watermelondb/WatermelonDB.h>
#endif
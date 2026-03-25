import Foundation
import MapKit

@objc(ApplePlacesModule)
class ApplePlacesModule: NSObject, RCTBridgeModule {

  static func moduleName() -> String! {
    return "ApplePlacesModule"
  }

  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  /// ISO alpha-3 → alpha-2 conversion for country filtering
  /// (MKMapItem.placemark.isoCountryCode returns alpha-2)
  private static let alpha3ToAlpha2: [String: String] = [
    "JPN": "JP", "MYS": "MY", "SGP": "SG", "THA": "TH", "VNM": "VN",
    "CAN": "CA", "USA": "US", "GBR": "GB", "AUS": "AU", "NZL": "NZ",
    "KOR": "KR", "IDN": "ID", "PHL": "PH", "IND": "IN", "CHN": "CN",
    "FRA": "FR", "DEU": "DE", "ITA": "IT", "ESP": "ES", "TWN": "TW",
    "HKG": "HK", "BRA": "BR", "MEX": "MX", "ARE": "AE", "SAU": "SA",
  ]

  /// Country center coordinates for geographic biasing (keyed by alpha-3)
  private static let countryRegions: [String: (lat: Double, lon: Double, span: Double)] = [
    "JPN": (36.2, 138.3, 10.0),
    "MYS": (4.2, 101.9, 8.0),
    "SGP": (1.35, 103.8, 1.0),
    "THA": (15.9, 100.9, 10.0),
    "VNM": (14.1, 108.3, 10.0),
    "CAN": (56.1, -106.3, 30.0),
    "USA": (37.1, -95.7, 30.0),
    "GBR": (55.4, -3.4, 8.0),
    "AUS": (-25.3, 133.8, 25.0),
    "NZL": (-40.9, 174.9, 8.0),
    "KOR": (35.9, 127.8, 5.0),
    "IDN": (-0.8, 113.9, 15.0),
    "PHL": (12.9, 121.8, 10.0),
    "IND": (20.6, 78.9, 20.0),
    "CHN": (35.9, 104.2, 25.0),
    "FRA": (46.2, 2.2, 8.0),
    "DEU": (51.2, 10.4, 6.0),
    "ITA": (41.9, 12.6, 8.0),
    "ESP": (40.5, -3.7, 8.0),
  ]

  /// Search for places using MKLocalSearch, filtered to a specific country
  @objc func search(
    _ query: String,
    type: String,
    countryCode: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    NSLog("[ApplePlaces] search called: query='%@' type='%@' countryCode='%@'", query, type, countryCode)

    let request = MKLocalSearch.Request()
    request.naturalLanguageQuery = query

    if type == "lodging" {
      request.pointOfInterestFilter = MKPointOfInterestFilter(including: [.hotel])
    } else if type == "address" {
      request.resultTypes = .address
    }

    // Set geographic region to bias toward the target country
    if !countryCode.isEmpty,
       let region = ApplePlacesModule.countryRegions[countryCode] {
      request.region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: region.lat, longitude: region.lon),
        span: MKCoordinateSpan(latitudeDelta: region.span, longitudeDelta: region.span)
      )
    }

    let search = MKLocalSearch(request: request)
    search.start { response, error in
      if let error = error {
        reject("SEARCH_ERROR", error.localizedDescription, error)
        return
      }

      guard let response = response else {
        resolve([])
        return
      }

      // Hard filter results to the target country
      // countryCode is alpha-3 (JPN), isoCountryCode is alpha-2 (JP)
      let alpha2 = ApplePlacesModule.alpha3ToAlpha2[countryCode] ?? ""
      NSLog("[ApplePlaces] filtering: countryCode='%@' alpha2='%@' totalResults=%d", countryCode, alpha2, response.mapItems.count)
      for item in response.mapItems.prefix(3) {
        NSLog("[ApplePlaces] result: '%@' country='%@'", item.name ?? "?", item.placemark.isoCountryCode ?? "?")
      }
      let items: [MKMapItem]
      if countryCode.isEmpty || alpha2.isEmpty {
        items = Array(response.mapItems.prefix(5))
      } else {
        items = Array(response.mapItems.filter { item in
          (item.placemark.isoCountryCode?.uppercased() ?? "") == alpha2
        }.prefix(5))
      }

      let results: [[String: Any]] = items.map { item in
        let placemark = item.placemark
        let streetNumber = placemark.subThoroughfare ?? ""
        let street = placemark.thoroughfare ?? ""
        let line1 = [streetNumber, street].filter { !$0.isEmpty }.joined(separator: " ")
        let city = placemark.locality ?? ""
        let state = placemark.administrativeArea ?? ""
        let postalCode = placemark.postalCode ?? ""
        let country = placemark.isoCountryCode ?? ""

        let mainText = item.name ?? line1
        let secondaryParts = [city, placemark.country].compactMap { $0 }.filter { !$0.isEmpty }
        let secondaryText = secondaryParts.joined(separator: ", ")

        return [
          "placeId": "\(item.hash)",
          "name": item.name ?? mainText,
          "description": [mainText, secondaryText].filter { !$0.isEmpty }.joined(separator: ", "),
          "mainText": mainText,
          "secondaryText": secondaryText,
          "address": [
            "line1": line1,
            "city": city,
            "state": state,
            "postalCode": postalCode,
            "country": country,
          ] as [String: String],
          "formattedAddress": [line1, city, state, postalCode, placemark.country]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: ", "),
        ]
      }

      resolve(results)
    }
  }
}

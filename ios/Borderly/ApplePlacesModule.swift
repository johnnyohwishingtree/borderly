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

  /// Search for places (hotels, addresses) using MKLocalSearchCompleter + MKLocalSearch
  @objc func search(
    _ query: String,
    type: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let request = MKLocalSearch.Request()
    request.naturalLanguageQuery = query

    // Filter by type
    if type == "lodging" {
      request.pointOfInterestFilter = MKPointOfInterestFilter(including: [
        .hotel,
      ])
    } else if type == "address" {
      request.resultTypes = .address
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

      let results: [[String: Any]] = response.mapItems.prefix(5).map { item in
        let placemark = item.placemark

        // Build structured address
        let streetNumber = placemark.subThoroughfare ?? ""
        let street = placemark.thoroughfare ?? ""
        let line1 = [streetNumber, street].filter { !$0.isEmpty }.joined(separator: " ")
        let city = placemark.locality ?? ""
        let state = placemark.administrativeArea ?? ""
        let postalCode = placemark.postalCode ?? ""
        let country = placemark.isoCountryCode ?? ""

        // Main text = POI name or street address
        let mainText = item.name ?? line1
        // Secondary text = city, country
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

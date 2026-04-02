import UIKit
import MobileCoreServices
import UniformTypeIdentifiers
import Security

/// Borderly Action Extension — auto-fills travel forms in Safari.
///
/// Appears in Safari's share sheet. When activated:
/// 1. Reads the user's profile from the shared Keychain
/// 2. Builds a JavaScript fill script using heuristic field matching
/// 3. Injects the script into the current web page
class ActionViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.systemBackground

        NSLog("[BorderlyAction] viewDidLoad called")
        NSLog("[BorderlyAction] inputItems count: \(extensionContext?.inputItems.count ?? 0)")

        // Get the JavaScript results from the page
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let itemProvider = extensionItem.attachments?.first else {
            NSLog("[BorderlyAction] No extension item or attachment")
            showError("Could not access page data")
            return
        }

        NSLog("[BorderlyAction] Provider types: \(itemProvider.registeredTypeIdentifiers)")

        // Request the preprocessed JavaScript results
        let jsType = UTType.propertyList.identifier
        NSLog("[BorderlyAction] Looking for type: \(jsType)")
        if itemProvider.hasItemConformingToTypeIdentifier(jsType) {
            NSLog("[BorderlyAction] Found property list type, loading...")
            itemProvider.loadItem(forTypeIdentifier: jsType, options: nil) { [weak self] item, error in
                NSLog("[BorderlyAction] loadItem callback fired, error: \(String(describing: error))")
                guard let self = self else { return }
                if let error = error {
                    DispatchQueue.main.async { self.showError(error.localizedDescription) }
                    return
                }

                // Extract the page URL from preprocessed results
                guard let results = item as? NSDictionary,
                      let jsResults = results[NSExtensionJavaScriptPreprocessingResultsKey] as? NSDictionary,
                      let pageURL = jsResults["url"] as? String else {
                    DispatchQueue.main.async { self.showError("Could not read page information") }
                    return
                }

                DispatchQueue.main.async {
                    self.fillPage(pageURL: pageURL)
                }
            }
        } else {
            NSLog("[BorderlyAction] No property list type found in provider")
            showError("This extension works with web pages in Safari")
        }
    }

    private func fillPage(pageURL: String) {
        // Load profile data from shared Keychain
        guard let profileData = loadProfileFromKeychain() else {
            showError("No profile found. Open Borderly and scan your passport first.")
            return
        }

        // Build the fill script
        let fillScript = buildFillScript(from: profileData)

        // Return the JavaScript to execute on the page
        let returnItem = NSExtensionItem()
        let jsDict: NSDictionary = [NSExtensionJavaScriptFinalizeArgumentKey: ["fillScript": fillScript]]
        let itemProvider = NSItemProvider(item: jsDict, typeIdentifier: UTType.propertyList.identifier)
        returnItem.attachments = [itemProvider]

        extensionContext?.completeRequest(returningItems: [returnItem], completionHandler: nil)
    }

    private func loadProfileFromKeychain() -> [String: String]? {
        // react-native-keychain stores profiles with service "borderly_profile_<id>"
        // and password containing JSON. Search for any matching service.
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: "borderly_user",
            kSecReturnData as String: true,
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitAll,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        NSLog("[BorderlyAction] Keychain query status: \(status)")

        guard status == errSecSuccess, let items = result as? [[String: Any]] else {
            NSLog("[BorderlyAction] No keychain items found (status: \(status))")
            return nil
        }

        NSLog("[BorderlyAction] Found \(items.count) keychain items")

        // Find the first profile item (service starts with "borderly_profile_")
        for item in items {
            guard let service = item[kSecAttrService as String] as? String,
                  service.hasPrefix("borderly_profile_"),
                  let data = item[kSecValueData as String] as? Data else {
                continue
            }

            NSLog("[BorderlyAction] Found profile with service: \(service)")

            // react-native-keychain stores password as UTF-8 string, not raw data
            if let jsonString = String(data: data, encoding: .utf8),
               let jsonData = jsonString.data(using: .utf8),
               let profile = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                // Flatten to [String: String] for the fill script
                var result: [String: String] = [:]
                for (key, value) in profile {
                    if let str = value as? String {
                        result[key] = str
                    }
                }
                NSLog("[BorderlyAction] Loaded profile: \(result.keys.sorted())")
                return result
            }
        }

        NSLog("[BorderlyAction] No borderly_profile_ items found")
        return nil
    }

    private func buildFillScript(from profile: [String: String]) -> String {
        // Build key-value pairs for field matching
        var pairs: [String] = []
        for (key, value) in profile {
            let escaped = value.replacingOccurrences(of: "'", with: "\\'")
            pairs.append("'\(key)': '\(escaped)'")
        }
        let dataObj = "{\(pairs.joined(separator: ", "))}"

        return """
        (function() {
            var data = \(dataObj);
            var fields = document.querySelectorAll('input, select, textarea');
            var filled = 0;
            var patterns = {
                'surname': /surname|family.?name|last.?name/i,
                'givenNames': /given|first.?name|forename/i,
                'passportNumber': /passport.?(number|no)|travel.?doc/i,
                'nationality': /national|citizen/i,
                'dateOfBirth': /birth|dob|born/i,
                'gender': /gender|sex/i,
                'passportExpiry': /expir|valid.?until/i,
                'issuingCountry': /issu|country.?of.?pass/i,
            };
            fields.forEach(function(el) {
                var id = (el.id + ' ' + el.name + ' ' + (el.placeholder || '')).toLowerCase();
                for (var key in patterns) {
                    if (patterns[key].test(id) && data[key]) {
                        if (el.tagName === 'SELECT') {
                            var opts = el.options;
                            for (var i = 0; i < opts.length; i++) {
                                if (opts[i].text.toLowerCase().includes(data[key].toLowerCase()) ||
                                    opts[i].value.toLowerCase().includes(data[key].toLowerCase())) {
                                    el.value = opts[i].value;
                                    el.dispatchEvent(new Event('change', {bubbles: true}));
                                    filled++;
                                    break;
                                }
                            }
                        } else {
                            el.value = data[key];
                            el.dispatchEvent(new Event('input', {bubbles: true}));
                            el.dispatchEvent(new Event('change', {bubbles: true}));
                            filled++;
                        }
                        break;
                    }
                }
            });
            return {filled: filled, total: fields.length};
        })();
        """
    }

    private func showError(_ message: String) {
        let alert = UIAlertController(title: "Borderly", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in
            self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        })
        present(alert, animated: true)
    }
}

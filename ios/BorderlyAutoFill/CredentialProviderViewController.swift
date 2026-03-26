import AuthenticationServices
import Security

/// AutoFill Credential Provider extension for Borderly.
///
/// Activated when the user taps a form field in Safari and selects Borderly
/// from the AutoFill bar. Loads the traveler profile from the shared Keychain
/// access group and presents fillable fields.
class CredentialProviderViewController: ASCredentialProviderViewController {

    // MARK: - Constants

    private enum Constants {
        static let keychainService = "borderly"
        static let sharedAccessGroup = "com.borderly.shared-keychain"
        static let appGroup = "group.com.borderly.shared"
        static let profileKeyPrefix = "borderly_profile_"
        static let legacyProfileKey = "borderly_traveler_profile"
    }

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
    }

    // MARK: - ASCredentialProviderViewController overrides

    override func prepareCredentialList(for serviceIdentifiers: [ASCredentialServiceIdentifier]) {
        // Called when iOS presents the AutoFill list.
        // Future: show list of fillable fields for the current page.
        // For now, cancel gracefully since UI is built in a later story.
        extensionContext.cancelRequest(withError: NSError(
            domain: ASExtensionErrorDomain,
            code: ASExtensionError.userCanceled.rawValue,
            userInfo: nil
        ))
    }

    override func provideCredentialWithoutUserInteraction(for credentialIdentity: ASPasswordCredentialIdentity) {
        // Called for silent AutoFill (no UI). Not applicable for travel forms.
        extensionContext.cancelRequest(withError: NSError(
            domain: ASExtensionErrorDomain,
            code: ASExtensionError.userInteractionRequired.rawValue,
            userInfo: nil
        ))
    }

    override func prepareInterfaceToProvideCredential(for credentialIdentity: ASPasswordCredentialIdentity) {
        // Called when user selects a credential that needs UI.
        // Future: show profile confirmation screen.
        extensionContext.cancelRequest(withError: NSError(
            domain: ASExtensionErrorDomain,
            code: ASExtensionError.userCanceled.rawValue,
            userInfo: nil
        ))
    }

    // MARK: - Shared Keychain Access

    /// Loads the traveler profile JSON from the shared Keychain access group.
    /// Returns the raw JSON string, or nil if no profile exists.
    func loadProfileFromSharedKeychain() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassInternetPassword,
            kSecAttrServer as String: Constants.legacyProfileKey,
            kSecAttrAccessGroup as String: Constants.sharedAccessGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let json = String(data: data, encoding: .utf8) else {
            return nil
        }

        return json
    }

    /// Loads a profile by ID from the shared Keychain access group.
    func loadProfileById(_ profileId: String) -> String? {
        let keychainKey = "\(Constants.profileKeyPrefix)\(profileId)"

        let query: [String: Any] = [
            kSecClass as String: kSecClassInternetPassword,
            kSecAttrServer as String: keychainKey,
            kSecAttrAccessGroup as String: Constants.sharedAccessGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let json = String(data: data, encoding: .utf8) else {
            return nil
        }

        return json
    }
}

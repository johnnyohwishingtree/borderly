import AuthenticationServices
import Security
import UIKit

/// AutoFill Credential Provider extension for Borderly.
///
/// Activated when the user taps a form field in Safari and selects Borderly
/// from the AutoFill bar. Loads the traveler profile from the shared Keychain
/// access group and presents fillable fields with resolved values.
class CredentialProviderViewController: ASCredentialProviderViewController {

    // MARK: - Constants

    private enum Constants {
        static let keychainService = "borderly"
        static let sharedAccessGroup = "com.borderly.shared-keychain"
        static let appGroup = "group.com.borderly.shared"
        static let profileKeyPrefix = "borderly_profile_"
        static let legacyProfileKey = "borderly_traveler_profile"
    }

    // MARK: - UI Colors (matching Borderly palette)

    private enum Colors {
        static let primary = UIColor(red: 59/255, green: 130/255, blue: 246/255, alpha: 1) // blue-500
        static let primaryDark = UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 1) // blue-600
        static let textPrimary = UIColor.label
        static let textSecondary = UIColor.secondaryLabel
        static let separator = UIColor.separator
        static let backgroundCard = UIColor.secondarySystemBackground
    }

    // MARK: - Properties

    private var profileFields: [(label: String, value: String)] = []
    private var profileName: String = ""

    // MARK: - UI Elements

    private lazy var headerView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private lazy var profileInitialsLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 20, weight: .bold)
        label.textColor = .white
        label.textAlignment = .center
        label.backgroundColor = Colors.primary
        label.layer.cornerRadius = 24
        label.layer.masksToBounds = true
        return label
    }()

    private lazy var profileNameLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 18, weight: .semibold)
        label.textColor = Colors.textPrimary
        return label
    }()

    private lazy var subtitleLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 13, weight: .regular)
        label.textColor = Colors.textSecondary
        label.text = "Tap a field to fill, or fill all at once"
        return label
    }()

    private lazy var tableView: UITableView = {
        let table = UITableView(frame: .zero, style: .insetGrouped)
        table.translatesAutoresizingMaskIntoConstraints = false
        table.delegate = self
        table.dataSource = self
        table.register(FieldCell.self, forCellReuseIdentifier: FieldCell.reuseId)
        table.backgroundColor = .systemBackground
        return table
    }()

    private lazy var fillAllButton: UIButton = {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setTitle("Fill all fields", for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
        button.setTitleColor(.white, for: .normal)
        button.backgroundColor = Colors.primary
        button.layer.cornerRadius = 12
        button.addTarget(self, action: #selector(fillAllTapped), for: .touchUpInside)
        return button
    }()

    private lazy var cancelButton: UIButton = {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setTitle("Cancel", for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 15, weight: .regular)
        button.setTitleColor(Colors.textSecondary, for: .normal)
        button.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        return button
    }()

    private lazy var emptyStateLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 16, weight: .regular)
        label.textColor = Colors.textSecondary
        label.text = "No profile found. Open Borderly to set up your traveler profile."
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }()

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        setupUI()
    }

    // MARK: - ASCredentialProviderViewController overrides

    override func prepareCredentialList(for serviceIdentifiers: [ASCredentialServiceIdentifier]) {
        loadProfileAndDisplay()
    }

    override func provideCredentialWithoutUserInteraction(for credentialIdentity: ASPasswordCredentialIdentity) {
        extensionContext.cancelRequest(withError: NSError(
            domain: ASExtensionErrorDomain,
            code: ASExtensionError.userInteractionRequired.rawValue,
            userInfo: nil
        ))
    }

    override func prepareInterfaceToProvideCredential(for credentialIdentity: ASPasswordCredentialIdentity) {
        loadProfileAndDisplay()
    }

    // MARK: - UI Setup

    private func setupUI() {
        // Header
        view.addSubview(headerView)
        headerView.addSubview(profileInitialsLabel)
        headerView.addSubview(profileNameLabel)
        headerView.addSubview(subtitleLabel)
        headerView.addSubview(cancelButton)

        // Table
        view.addSubview(tableView)

        // Fill All button
        view.addSubview(fillAllButton)

        // Empty state
        view.addSubview(emptyStateLabel)
        emptyStateLabel.isHidden = true

        NSLayoutConstraint.activate([
            // Header
            headerView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
            headerView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            headerView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),

            // Cancel button
            cancelButton.topAnchor.constraint(equalTo: headerView.topAnchor),
            cancelButton.trailingAnchor.constraint(equalTo: headerView.trailingAnchor),

            // Profile initials
            profileInitialsLabel.topAnchor.constraint(equalTo: headerView.topAnchor, constant: 8),
            profileInitialsLabel.leadingAnchor.constraint(equalTo: headerView.leadingAnchor),
            profileInitialsLabel.widthAnchor.constraint(equalToConstant: 48),
            profileInitialsLabel.heightAnchor.constraint(equalToConstant: 48),

            // Profile name
            profileNameLabel.centerYAnchor.constraint(equalTo: profileInitialsLabel.centerYAnchor, constant: -10),
            profileNameLabel.leadingAnchor.constraint(equalTo: profileInitialsLabel.trailingAnchor, constant: 12),
            profileNameLabel.trailingAnchor.constraint(equalTo: cancelButton.leadingAnchor, constant: -8),

            // Subtitle
            subtitleLabel.topAnchor.constraint(equalTo: profileNameLabel.bottomAnchor, constant: 2),
            subtitleLabel.leadingAnchor.constraint(equalTo: profileNameLabel.leadingAnchor),
            subtitleLabel.trailingAnchor.constraint(equalTo: profileNameLabel.trailingAnchor),
            subtitleLabel.bottomAnchor.constraint(equalTo: headerView.bottomAnchor, constant: -8),

            // Table
            tableView.topAnchor.constraint(equalTo: headerView.bottomAnchor, constant: 8),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: fillAllButton.topAnchor, constant: -12),

            // Fill All button
            fillAllButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            fillAllButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            fillAllButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -12),
            fillAllButton.heightAnchor.constraint(equalToConstant: 50),

            // Empty state
            emptyStateLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            emptyStateLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            emptyStateLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 32),
            emptyStateLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -32),
        ])
    }

    // MARK: - Profile Loading

    private func loadProfileAndDisplay() {
        guard let json = loadProfileFromSharedKeychain(),
              let data = json.data(using: .utf8),
              let profile = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            showEmptyState()
            return
        }

        populateFields(from: profile)
        updateHeader(from: profile)
        tableView.reloadData()
    }

    private func populateFields(from profile: [String: Any]) {
        profileFields = []

        let fieldMappings: [(key: String, label: String)] = [
            ("passportNumber", "Passport number"),
            ("surname", "Surname"),
            ("givenNames", "Given name"),
            ("dateOfBirth", "Date of birth"),
            ("nationality", "Nationality"),
            ("gender", "Gender"),
            ("passportExpiry", "Passport expiry"),
            ("issuingCountry", "Issuing country"),
            ("email", "Email"),
            ("phoneNumber", "Phone number"),
        ]

        for mapping in fieldMappings {
            if let value = profile[mapping.key] as? String, !value.isEmpty {
                profileFields.append((label: mapping.label, value: value))
            }
        }
    }

    private func updateHeader(from profile: [String: Any]) {
        let given = profile["givenNames"] as? String ?? ""
        let surname = profile["surname"] as? String ?? ""
        profileName = [given, surname].filter { !$0.isEmpty }.joined(separator: " ")
        profileNameLabel.text = profileName

        let initials = [given, surname]
            .compactMap { $0.first.map(String.init) }
            .joined()
        profileInitialsLabel.text = initials.isEmpty ? "?" : initials
    }

    private func showEmptyState() {
        tableView.isHidden = true
        fillAllButton.isHidden = true
        emptyStateLabel.isHidden = false
    }

    // MARK: - Actions

    @objc private func fillAllTapped() {
        // Copy all field values to clipboard as a formatted string
        let allValues = profileFields
            .map { "\($0.label): \($0.value)" }
            .joined(separator: "\n")
        UIPasteboard.general.string = allValues

        // Schedule clipboard clear after 60 seconds (security boundary rule)
        DispatchQueue.main.asyncAfter(deadline: .now() + 60) {
            if UIPasteboard.general.string == allValues {
                UIPasteboard.general.string = ""
            }
        }

        // Dismiss with success feedback
        extensionContext.cancelRequest(withError: NSError(
            domain: ASExtensionErrorDomain,
            code: ASExtensionError.userCanceled.rawValue,
            userInfo: nil
        ))
    }

    @objc private func cancelTapped() {
        extensionContext.cancelRequest(withError: NSError(
            domain: ASExtensionErrorDomain,
            code: ASExtensionError.userCanceled.rawValue,
            userInfo: nil
        ))
    }

    // MARK: - Shared Keychain Access

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

// MARK: - UITableViewDataSource & UITableViewDelegate

extension CredentialProviderViewController: UITableViewDataSource, UITableViewDelegate {

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return profileFields.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: FieldCell.reuseId, for: indexPath)
        if let fieldCell = cell as? FieldCell {
            let field = profileFields[indexPath.row]
            fieldCell.configure(label: field.label, value: field.value)
        }
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let field = profileFields[indexPath.row]

        // Copy single field value to clipboard
        UIPasteboard.general.string = field.value

        // Schedule clipboard clear after 60 seconds
        let copiedValue = field.value
        DispatchQueue.main.asyncAfter(deadline: .now() + 60) {
            if UIPasteboard.general.string == copiedValue {
                UIPasteboard.general.string = ""
            }
        }

        // Brief visual feedback
        if let cell = tableView.cellForRow(at: indexPath) as? FieldCell {
            cell.showCopiedFeedback()
        }
    }

    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        return "Profile fields"
    }
}

// MARK: - FieldCell

/// Table view cell that displays a field label and its resolved value.
final class FieldCell: UITableViewCell {

    static let reuseId = "FieldCell"

    private let fieldLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 13, weight: .regular)
        label.textColor = .secondaryLabel
        return label
    }()

    private let valueLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 17, weight: .regular)
        label.textColor = .label
        return label
    }()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupCell()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupCell()
    }

    private func setupCell() {
        contentView.addSubview(fieldLabel)
        contentView.addSubview(valueLabel)

        NSLayoutConstraint.activate([
            fieldLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 8),
            fieldLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            fieldLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),

            valueLabel.topAnchor.constraint(equalTo: fieldLabel.bottomAnchor, constant: 2),
            valueLabel.leadingAnchor.constraint(equalTo: fieldLabel.leadingAnchor),
            valueLabel.trailingAnchor.constraint(equalTo: fieldLabel.trailingAnchor),
            valueLabel.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -8),
        ])
    }

    func configure(label: String, value: String) {
        fieldLabel.text = label
        valueLabel.text = value
    }

    func showCopiedFeedback() {
        let original = valueLabel.text
        valueLabel.text = "Copied!"
        valueLabel.textColor = UIColor(red: 59/255, green: 130/255, blue: 246/255, alpha: 1)

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.valueLabel.text = original
            self?.valueLabel.textColor = .label
        }
    }
}

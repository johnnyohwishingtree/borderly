# Fact: WatermelonDB Encrypts at Rest

WatermelonDB uses SQLite with JSI for native speed. It supports at-rest encryption but the decryption key must exist in memory during use. The key is stored separately in Keychain.

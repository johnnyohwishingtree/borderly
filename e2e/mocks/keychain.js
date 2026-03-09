module.exports = {
  setInternetCredentials: () => Promise.resolve(true),
  getInternetCredentials: () => Promise.resolve({ password: '{}' }),
  resetInternetCredentials: () => Promise.resolve(true),
  resetGenericPassword: () => Promise.resolve(true),
  getSupportedBiometryType: () => Promise.resolve('TouchID'),
  AUTHENTICATION_TYPE: { BIOMETRICS: 'AuthenticationWithBiometricsDevicePasscode' },
  ACCESS_CONTROL: { BIOMETRY_CURRENT_SET: 'kSecAccessControlBiometryCurrentSet' },
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'kSecAttrAccessibleWhenUnlockedThisDeviceOnly' },
};

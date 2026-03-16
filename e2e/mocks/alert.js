// Web-compatible Alert mock that uses native browser dialogs
// instead of React Native Web's no-op Alert.alert().
//
// This allows:
// 1. Alert buttons' onPress callbacks to actually fire on web
// 2. Playwright's page.on('dialog') to intercept and respond to alerts

class Alert {
  static alert(title, message, buttons) {
    const alertMessage = message ? `${title}\n\n${message}` : title;

    // No buttons or single button → simple alert
    if (!buttons || buttons.length <= 1) {
      window.alert(alertMessage);
      buttons?.[0]?.onPress?.();
      return;
    }

    // Two or more buttons → use confirm()
    // Convention: last button is the "confirm/destructive" action,
    // earlier buttons are "cancel" actions
    const confirmed = window.confirm(alertMessage);

    if (confirmed) {
      buttons[buttons.length - 1]?.onPress?.();
    } else {
      const cancelButton = buttons.find(b => b.style === 'cancel') || buttons[0];
      cancelButton?.onPress?.();
    }
  }
}

export default Alert;

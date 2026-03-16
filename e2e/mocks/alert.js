// Web-compatible Alert mock that uses native browser dialogs
// instead of React Native Web's no-op Alert.alert().
//
// This allows:
// 1. Alert buttons' onPress callbacks to actually fire on web
// 2. Playwright's page.on('dialog') to intercept and respond to alerts

class Alert {
  static alert(title, message, buttons, options) {
    // No buttons or single button → simple alert, call onPress if present
    if (!buttons || buttons.length === 0) {
      window.alert(message ? `${title}\n\n${message}` : title);
      return;
    }

    if (buttons.length === 1) {
      window.alert(message ? `${title}\n\n${message}` : title);
      if (buttons[0].onPress) {
        buttons[0].onPress();
      }
      return;
    }

    // Two or more buttons → use confirm()
    // Convention: last button is the "confirm/destructive" action,
    // earlier buttons are "cancel" actions
    const result = window.confirm(message ? `${title}\n\n${message}` : title);

    if (result) {
      // User clicked OK → trigger the last button's onPress
      const confirmButton = buttons[buttons.length - 1];
      if (confirmButton && confirmButton.onPress) {
        confirmButton.onPress();
      }
    } else {
      // User clicked Cancel → trigger the first cancel-style button's onPress
      const cancelButton = buttons.find(b => b.style === 'cancel') || buttons[0];
      if (cancelButton && cancelButton.onPress) {
        cancelButton.onPress();
      }
    }
  }
}

export default Alert;

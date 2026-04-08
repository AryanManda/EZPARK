export function getOwnerAnnouncementMessage(
  isAnnouncementTab,
  hasInput,
  hasActiveParkers
) {
  if (!isAnnouncementTab) {
    return "Navigate to the announcements tab.";
  }

  if (!hasActiveParkers) {
    return "You have no active parkers.";
  }

  if (!hasInput) {
    return "Please enter a message into the textbox.";
  }

  return "Announcement sent.";
}

export function getCheckoutMessage(
  isVehicleSelected,
  isCheckedIn,
  hasPaymentMethod
) {
  if (!isVehicleSelected) {
    return "Select the parked vehicle";
  }

  if (!isCheckedIn && !hasPaymentMethod) {
    return "User is not parked anywhere.";
  }

  if (!isCheckedIn) {
    return "User is not parked.";
  }

  if (!hasPaymentMethod) {
    return "Add a valid payment method and try again.";
  }

  return "Check Out Sucessful!";
}

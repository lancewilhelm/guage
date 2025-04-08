export async function copyToClipboard(text: string) {
  let result = false;

  // Check if the Clipboard API is available
  if (!navigator.clipboard) {
    // Fallback for insecure contexts or older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      logger.debug(
        "Fallback: Copying text command was",
        successful ? "successful" : "unsuccessful",
      );
      result = successful;
    } catch (err) {
      logger.error("Fallback: Unable to copy", err);
    }

    document.body.removeChild(textArea);
    return result;
  }

  // Use modern Clipboard API
  try {
    await navigator.clipboard.writeText(text);
    logger.debug("Async: Copying to clipboard was successful!");
    result = true;
  } catch (error) {
    logger.error("Async: Could not copy text:", error);
    result = false;
  }

  return result;
}

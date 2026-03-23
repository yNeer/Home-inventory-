from playwright.sync_api import sync_playwright
import time

def verify_mascot(page):
    page.goto("http://localhost:5173")

    # Wait for the app to load
    page.wait_for_selector("text=Dashboard", timeout=10000)

    # Click on the Profile tab (Desktop or Mobile)
    # The desktop one is a button with 'Profile' text, mobile is a button with 'Me' text
    # Let's find any button with the user circle icon or 'Profile' text
    page.click("button:has-text('Profile')")

    # Wait for the profile view to load
    page.wait_for_selector("text=Inventory Squirrel", timeout=5000)

    # Wait a bit for the animation to start
    time.sleep(1)

    # Take a screenshot of the profile view
    page.screenshot(path="verification/verification.png")
    print("Screenshot saved to verification/verification.png")

if __name__ == "__main__":
    import os
    os.makedirs("verification", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_mascot(page)
        finally:
            browser.close()

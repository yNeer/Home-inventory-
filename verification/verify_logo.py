from playwright.sync_api import sync_playwright

def test_logo_visibility(page):
    page.goto("http://localhost:5173/")
    page.wait_for_selector("svg", state="visible")
    page.screenshot(path="verification/logo_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_logo_visibility(page)
        finally:
            browser.close()

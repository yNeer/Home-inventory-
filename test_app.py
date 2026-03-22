from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Capture console errors
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        page.goto('http://localhost:5174')
        page.wait_for_timeout(5000)
        page.screenshot(path='test_error.png')
        browser.close()

run()

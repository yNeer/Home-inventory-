from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # 1. Desktop Viewport
        page_desktop = browser.new_page(viewport={"width": 1280, "height": 800})
        page_desktop.goto('http://localhost:5173')
        page_desktop.wait_for_timeout(1000)
        page_desktop.screenshot(path='verification/01_desktop_dashboard_no_fab.png')

        # 2. Meds Viewport
        page_desktop.get_by_role("button", name="Medicines").click()
        page_desktop.wait_for_timeout(500)
        page_desktop.screenshot(path='verification/02_desktop_meds_no_fab.png')

        page_desktop.close()
        browser.close()

run()

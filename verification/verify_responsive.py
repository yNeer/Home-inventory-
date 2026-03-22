from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # 1. Desktop Viewport
        page_desktop = browser.new_page(viewport={"width": 1280, "height": 800})
        page_desktop.goto('http://localhost:5173')
        page_desktop.wait_for_timeout(1000)
        page_desktop.screenshot(path='verification/desktop_dashboard.png')

        page_desktop.get_by_role("button", name="Scan Item").click()
        page_desktop.wait_for_timeout(500)
        page_desktop.screenshot(path='verification/desktop_add_item.png')

        page_desktop.close()

        # 2. Mobile Viewport
        page_mobile = browser.new_page(viewport={"width": 375, "height": 667})
        page_mobile.goto('http://localhost:5173')
        page_mobile.wait_for_timeout(1000)
        page_mobile.screenshot(path='verification/mobile_dashboard.png')

        page_mobile.get_by_role("button", name="Scan Medicine or Grocery").click()
        page_mobile.wait_for_timeout(500)
        page_mobile.screenshot(path='verification/mobile_add_item.png')

        page_mobile.close()
        browser.close()

run()

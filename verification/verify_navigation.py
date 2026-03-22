from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Dashboard view
        page.goto('http://localhost:5173')
        page.wait_for_timeout(1000)
        page.screenshot(path='verification/01_dashboard_nav.png')

        # Navigate to Health Plan
        page.get_by_text("Plan", exact=True).click()
        page.wait_for_timeout(500)
        page.screenshot(path='verification/02_health_plan.png')

        # Navigate to Notifications
        page.get_by_text("Alerts", exact=True).click()
        page.wait_for_timeout(500)
        page.screenshot(path='verification/03_notifications.png')

        # Navigate to Profile
        page.get_by_text("Me", exact=True).click()
        page.wait_for_timeout(500)
        page.screenshot(path='verification/04_profile.png')

        # Navigate to Add Item (FAB)
        page.get_by_role("button", name="Scan Medicine or Grocery").click()
        page.wait_for_timeout(500)
        page.screenshot(path='verification/05_add_item_ocr.png')

        browser.close()

run()

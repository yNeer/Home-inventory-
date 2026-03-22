from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 414, "height": 896})

        # 1. Dashboard -> Meds View
        page.goto('http://localhost:5173')
        page.wait_for_timeout(1000)

        # Go to Add item
        page.locator('button:has-text("Meds")').first.click()
        page.wait_for_timeout(500)
        page.get_by_text("Add Medicine", exact=True).click()
        page.wait_for_timeout(500)

        # Fill manual data for a Before Food medicine reminder
        page.locator('input[name="name"]').fill("Aspirin 500mg")
        page.locator('select[name="reminderOption"]').select_option("daily")
        page.locator('select[name="medicineTiming"]').select_option("before_food")

        # Save (Mobile view save button)
        buttons = page.locator('button').all()
        for btn in buttons:
            cls = btn.get_attribute("class") or ""
            if "md:hidden" in cls and "bg-gradient-to-tr" in cls:
                btn.click()
                break

        page.wait_for_timeout(1000)

        # In current design, Notifications are accessed via the Dashboard header bell icon on mobile
        page.locator('button:has-text("Home")').first.click()
        page.wait_for_timeout(500)

        # Click Top Header Bell Icon
        header_buttons = page.locator('header button').all()
        for b in header_buttons:
             if 'rounded-full' in (b.get_attribute("class") or ""):
                 b.click()
                 break

        page.wait_for_timeout(1000)
        page.screenshot(path='verification/01_notifications_populated.png')

        # Test 10 min reminder button (expect alert)
        page.on("dialog", lambda dialog: dialog.accept()) # accept the 'alert'
        page.get_by_text("10 Min", exact=True).click()
        page.wait_for_timeout(500)

        # Screenshot to show it was dismissed
        page.screenshot(path='verification/02_notifications_dismissed.png')

        browser.close()

run()

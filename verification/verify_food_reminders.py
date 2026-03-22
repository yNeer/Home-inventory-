from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 414, "height": 896})

        # 1. Dashboard
        page.goto('http://localhost:5173')
        page.wait_for_timeout(1000)

        # Go to Add item
        page.locator('button:has-text("Meds")').first.click()
        page.wait_for_timeout(500)
        page.get_by_text("Add Medicine", exact=True).click()
        page.wait_for_timeout(500)

        # Fill manual data for a Before Food medicine reminder
        page.locator('input[name="name"]').fill("Omeprazole 20mg")
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

        # Go to Notifications via Home header bell
        page.locator('button:has-text("Home")').first.click()
        page.wait_for_timeout(500)

        header_buttons = page.locator('header button').all()
        for b in header_buttons:
             if 'rounded-full' in (b.get_attribute("class") or ""):
                 b.click()
                 break

        page.wait_for_timeout(1000)
        page.screenshot(path='verification/01_food_reminders_buttons.png')

        browser.close()

run()

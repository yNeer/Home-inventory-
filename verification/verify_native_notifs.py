from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--enable-features=Notifications"])

        # We need to explicitly mock/grant notification permissions in playwright
        context = browser.new_context(permissions=['notifications'])

        page = context.new_page()
        page.set_viewport_size({"width": 414, "height": 896})

        page.goto('http://localhost:5173')
        page.wait_for_timeout(1000)

        # 1. Profile Page to toggle Push Notifications ON
        page.locator('button:has-text("Me")').first.click()
        page.wait_for_timeout(500)

        page.locator('button:has-text("Push Notifications")').first.click()
        page.wait_for_timeout(500)
        page.screenshot(path='verification/01_profile_notifs_enabled.png')

        # 2. Add Item (Before Food)
        page.locator('button:has-text("Home")').first.click()
        page.wait_for_timeout(500)

        header_buttons = page.locator('header button').all()
        for b in header_buttons:
             if 'rounded-full' in (b.get_attribute("class") or "") and 'md:hidden' in (b.get_attribute("class") or ""):
                 b.click()
                 break

        page.wait_for_timeout(500)

        page.locator('input[name="name"]').fill("Vitamin Test")
        page.locator('select[name="reminderOption"]').select_option("daily")
        page.locator('select[name="medicineTiming"]').select_option("before_food")

        buttons = page.locator('button').all()
        for btn in buttons:
            cls = btn.get_attribute("class") or ""
            if "md:hidden" in cls and "bg-gradient-to-tr" in cls:
                btn.click()
                break

        page.wait_for_timeout(1000)

        # 3. Notification Snooze Action (Should trigger native OS logic under the hood)
        page.locator('button:has-text("Home")').first.click() # Ensure we are home
        page.wait_for_timeout(500)

        header_buttons = page.locator('header button').all()
        for b in header_buttons:
             if 'rounded-full' in (b.get_attribute("class") or "") and not 'md:hidden' in (b.get_attribute("class") or ""):
                 b.click()
                 break

        page.wait_for_timeout(1000)

        page.on("dialog", lambda dialog: dialog.accept()) # Accept the 'Native reminder scheduled...' alert
        page.get_by_text("10 Min", exact=True).click()
        page.wait_for_timeout(500)

        page.screenshot(path='verification/02_notifications_snoozed_native.png')

        browser.close()

run()

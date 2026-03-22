from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Capture console errors
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        # Load dashboard
        page.goto('http://localhost:5173')
        page.wait_for_timeout(2000)
        page.screenshot(path='verification/dashboard_final.png')

        # Click FAB
        fab_clicked = False
        buttons = page.locator('button').all()
        for btn in buttons:
            class_name = btn.get_attribute('class') or ''
            if 'fixed' in class_name and 'rounded-full' in class_name:
                btn.click()
                fab_clicked = True
                break

        if fab_clicked:
            page.wait_for_timeout(2000)
            page.screenshot(path='verification/add_item_final.png')
        else:
            print("FAB not found")

        browser.close()

run()

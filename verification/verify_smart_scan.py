from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 414, "height": 896})

        # 1. Dashboard -> Meds View
        page.goto('http://localhost:5173')
        page.wait_for_timeout(1000)

        # Click the button containing the text "Meds"
        page.locator('button:has-text("Meds")').first.click()
        page.wait_for_timeout(500)
        page.screenshot(path='verification/01_medicines_empty.png')

        # 2. Add Item (Smart Scan)
        page.get_by_text("Add Medicine", exact=True).click()
        page.wait_for_timeout(500)
        page.screenshot(path='verification/02_add_medicine_smart_scan.png')

        # 3. Multi-Scan Mode
        page.get_by_text("Multi-Scan", exact=True).click()
        page.wait_for_timeout(500)
        page.screenshot(path='verification/03_add_medicine_multi_scan.png')

        browser.close()

run()

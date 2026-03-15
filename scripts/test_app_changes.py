"""
Playwright script to verify application changes in browser.
Tests: OAuth buttons, onboarding flow, mobile menu navigation
"""
from playwright.sync_api import sync_playwright
import os

# Ensure screenshots directory exists
SCREENSHOT_DIR = "test-results"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def test_signin_page(page):
    """Navigate to sign-in page and verify OAuth buttons."""
    print("\n=== Testing Sign-In Page ===")
    
    # Navigate to the app
    page.goto('http://tfmd-booking-app.vercel.app')
    page.wait_for_load_state('networkidle')
    
    # Take initial screenshot
    page.screenshot(path=f'{SCREENSHOT_DIR}/01-home-page.png', full_page=True)
    print(f"Screenshot: {SCREENSHOT_DIR}/01-home-page.png")
    
    # Look for sign-in elements - try different selectors
    # Check for OAuth buttons - they may be in the header or on a sign-in page
    oauth_buttons = []
    
    # Try to find Google button
    try:
        google_btn = page.locator('button:has-text("Google"), a:has-text("Google"), [class*="google"]').first
        if google_btn.is_visible():
            oauth_buttons.append("Google")
            print("✓ Google OAuth button found")
    except Exception as e:
        print(f"  Google button: {e}")
    
    # Try to find Facebook button
    try:
        fb_btn = page.locator('button:has-text("Facebook"), a:has-text("Facebook"), [class*="facebook"]').first
        if fb_btn.is_visible():
            oauth_buttons.append("Facebook")
            print("✓ Facebook OAuth button found")
    except Exception as e:
        print(f"  Facebook button: {e}")
    
    # Try to find Apple button
    try:
        apple_btn = page.locator('button:has-text("Apple"), a:has-text("Apple"), [class*="apple"]').first
        if apple_btn.is_visible():
            oauth_buttons.append("Apple")
            print("✓ Apple OAuth button found")
    except Exception as e:
        print(f"  Apple button: {e}")
    
    # Take screenshot of current page
    page.screenshot(path=f'{SCREENSHOT_DIR}/02-signin-page.png', full_page=True)
    print(f"Screenshot: {SCREENSHOT_DIR}/02-signin-page.png")
    
    return oauth_buttons

def test_onboarding_flow(page):
    """Test the onboarding flow - verify it shows only 2 steps."""
    print("\n=== Testing Onboarding Flow ===")
    
    # Navigate to onboarding
    page.goto('http://tfmd-booking-app.vercel.app/onboarding')
    page.wait_for_load_state('networkidle')
    
    # Wait a bit for animations
    page.wait_for_timeout(1000)
    
    # Take screenshot
    page.screenshot(path=f'{SCREENSHOT_DIR}/03-onboarding.png', full_page=True)
    print(f"Screenshot: {SCREENSHOT_DIR}/03-onboarding.png")
    
    # Check for step indicators - look for Waiver and Injuries
    steps_found = []
    
    # Look for "Waiver" step
    try:
        waiver = page.locator('text=Waiver').first
        if waiver.is_visible():
            steps_found.append("Waiver")
            print("✓ Waiver step found")
    except:
        print("  Waiver step not found")
    
    # Look for "Injuries" step
    try:
        injuries = page.locator('text=Injuries').first
        if injuries.is_visible():
            steps_found.append("Injuries")
            print("✓ Injuries step found")
    except:
        print("  Injuries step not found")
    
    # Look for "Movement Goals" - should NOT be present
    try:
        movement = page.locator('text=Movement Goals').first
        if movement.is_visible():
            print("⚠ Movement Goals step found (should NOT be present)")
        else:
            print("✓ Movement Goals step NOT found (correct)")
    except:
        print("✓ Movement Goals step NOT found (correct)")
    
    # Check for step count - look for "1 of 2" or "Step 1 of 2"
    try:
        step_text = page.locator('text=/\\d+ of \\d+/').first
        if step_text.is_visible():
            print(f"Step indicator: {step_text.inner_text()}")
    except:
        pass
    
    return steps_found

def test_client_app_navigation(page):
    """Test the client app bottom navigation."""
    print("\n=== Testing Client App Navigation ===")
    
    # Navigate to client app
    page.goto('http://tfmd-booking-app.vercel.app/client')
    page.wait_for_load_state('networkidle')
    
    # Wait for animations
    page.wait_for_timeout(1000)
    
    # Take screenshot
    page.screenshot(path=f'{SCREENSHOT_DIR}/04-client-app.png', full_page=True)
    print(f"Screenshot: {SCREENSHOT_DIR}/04-client-app.png")
    
    # Look for bottom navigation
    bottom_nav_found = False
    nav_items = []
    
    try:
        # Try to find bottom navigation bar
        bottom_nav = page.locator('nav, [class*="bottom"], [class*="nav"]').filter(has=page.locator('button, a')).first
        if bottom_nav.is_visible():
            bottom_nav_found = True
            print("✓ Bottom navigation found")
            
            # Get all nav items/buttons
            nav_buttons = bottom_nav.locator('button, a').all()
            for btn in nav_buttons:
                try:
                    text = btn.inner_text()
                    if text.strip():
                        nav_items.append(text.strip())
                        print(f"  - {text.strip()}")
                except:
                    pass
    except Exception as e:
        print(f"Bottom navigation search: {e}")
    
    # Check for improved spacing - look for larger text in nav
    try:
        nav_text = page.locator('[class*="nav"] button, [class*="nav"] a').first
        if nav_text.is_visible():
            font_size = nav_text.evaluate('el => window.getComputedStyle(el).fontSize')
            print(f"Nav item font size: {font_size}")
    except Exception as e:
        print(f"Font size check: {e}")
    
    return bottom_nav_found, nav_items

def main():
    """Main test runner."""
    print("Starting browser tests...")
    print(f"Screenshots will be saved to: {SCREENSHOT_DIR}")
    
    with sync_playwright() as p:
        # Launch browser in headless mode
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Set viewport for mobile-like view
        page.set_viewport_size({"width": 375, "height": 812})
        
        # Run tests
        results = {}
        
        # Test 1: Sign-In Page
        oauth_buttons = test_signin_page(page)
        results['oauth_buttons'] = oauth_buttons
        
        # Test 2: Onboarding Flow
        steps = test_onboarding_flow(page)
        results['onboarding_steps'] = steps
        
        # Test 3: Client App Navigation
        nav_found, nav_items = test_client_app_navigation(page)
        results['nav_found'] = nav_found
        results['nav_items'] = nav_items
        
        # Close browser
        browser.close()
    
    # Print summary
    print("\n" + "="*50)
    print("TEST RESULTS SUMMARY")
    print("="*50)
    print(f"OAuth Buttons Found: {results.get('oauth_buttons', [])}")
    print(f"Onboarding Steps: {results.get('onboarding_steps', [])}")
    print(f"Bottom Navigation Found: {results.get('nav_found', False)}")
    print(f"Navigation Items: {results.get('nav_items', [])}")
    print(f"\nScreenshots saved to: {SCREENSHOT_DIR}/")
    print("="*50)

if __name__ == "__main__":
    main()

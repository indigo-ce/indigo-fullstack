/**
 * Authentication Test Helpers
 *
 * Reusable functions for common authentication flows in e2e tests.
 * These helpers reduce duplication and make tests more maintainable.
 */

import type {Page} from "@playwright/test";
import {ROUTES} from "../config/test-data";

/**
 * Sign up a new user
 */
export async function signUp(
  page: Page,
  email: string,
  password: string,
  name: string
) {
  await page.goto(ROUTES.signUp);
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill(password);
  await page.getByTestId("submit-button").click();
}

/**
 * Sign in an existing user
 */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto(ROUTES.signIn);
  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill(password);
  await page.getByTestId("submit-button").click();
}

/**
 * Fill sign-up form without submitting (useful for validation tests)
 */
export async function fillSignUpForm(
  page: Page,
  email: string,
  password: string,
  name: string
) {
  await page.goto(ROUTES.signUp);
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill(password);
}

/**
 * Fill sign-in form without submitting (useful for validation tests)
 */
export async function fillSignInForm(
  page: Page,
  email: string,
  password: string
) {
  await page.goto(ROUTES.signIn);
  await page.getByTestId("email-input").fill(email);
  await page.getByTestId("password-input").fill(password);
}

/**
 * Submit the current form
 */
export async function submitForm(page: Page) {
  await page.getByTestId("submit-button").click();
}

/**
 * Check if error message is visible
 */
export async function expectErrorMessage(page: Page, pattern: RegExp) {
  const errorMessage = page.locator(`text=${pattern}`);
  return errorMessage;
}

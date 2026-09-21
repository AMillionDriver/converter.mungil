import axios from 'axios';
import config from '../config/env.js';

export async function verifyTurnstileToken(token: string) {
  try {
    const response = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      new URLSearchParams({
        secret: config.CLOUDFLARE_TURNSTILE_SECRET,
        response: token,
      })
    );

    return response.data.success;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

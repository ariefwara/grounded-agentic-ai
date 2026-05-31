import { Injectable } from '@angular/core';

type DecisionResponse = {
  answer?: string;
  finalDecision?: string;
};

@Injectable({ providedIn: 'root' })
export class EngineClient {
  private readonly baseUrl = 'http://localhost:3000';

  async sendMessage(message: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        channel: 'web-chat',
        message,
        user: {
          identityConfidence: 'verified_customer',
          accountIds: ['acct_123'],
        },
        subject: {
          accountId: 'acct_123',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Engine request failed with ${response.status}`);
    }

    const result = (await response.json()) as DecisionResponse;
    return result.answer || 'I could not produce an answer for that request.';
  }
}

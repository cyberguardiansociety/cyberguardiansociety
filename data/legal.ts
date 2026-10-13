/**
 * Long-form policy copy for the legal pages. Kept in one place so the wording
 * is easy to review and diff. These documents are drafted for an independent,
 * student-led organisation — have them checked against the laws that apply to
 * your registration before publishing.
 */

export type Block =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }

export type LegalSection = {
  id: string
  title: string
  blocks: Block[]
}

export type LegalDocument = {
  slug: 'privacy' | 'code-of-conduct' | 'terms'
  title: string
  description: string
  updated: { iso: string; label: string }
  appliesTo: string
  summary: string[]
  sections: LegalSection[]
}

const UPDATED = { iso: '2026-10-01', label: '1 October 2026' }

export const privacyPolicy: LegalDocument = {
  slug: 'privacy',
  title: 'Privacy Policy',
  description: 'What we collect when you apply, contact or work with us, why we collect it, and the control you keep over it.',
  updated: UPDATED,
  appliesTo: 'This website and all Society activities',
  summary: [
    'We collect only what we need to run the Society: your application, messages you send us, and short-lived server logs.',
    'We don\'t sell personal data or share it for advertising.',
    'You can request access, correction or deletion of your data, among other rights. We reply within 30 days.',
  ],
  sections: [
    {
      id: 'overview',
      title: 'Overview',
      blocks: [
        { type: 'p', text: 'Cyber Guardian Society is an independent student-led cybersecurity community. We collect the minimum amount of personal data needed to run the Society: membership applications, messages you send us, and the records that let us communicate with members and operate community programmes.' },
        { type: 'p', text: 'This policy explains what that data is, why we hold it, how long we keep it, and what you can ask us to do with it.' },
      ],
    },
    {
      id: 'who-we-are',
      title: 'Who we are',
      blocks: [
        { type: 'p', text: 'For the purposes of this policy, Cyber Guardian Society ("CGS", "we", "us") is the independent student-led organisation that operates this website and its community. Questions about this policy can be sent to the address listed on our contact page.' },
      ],
    },
    {
      id: 'what-we-collect',
      title: 'Information we collect',
      blocks: [
        {
          type: 'list',
          items: [
            'Membership applications: name, preferred name, email address, phone or WhatsApp number, country, city, current status, institution, degree or programme, year or semester, and any professional links you choose to share.',
            'Division preferences, skills and experience, including an optional curriculum vitae file you upload.',
            'Correspondence: the contents of messages you send through the contact form or by email.',
            'Technical data: basic, aggregated request information such as IP address, browser type and pages visited, retained only in short-lived server logs for security and troubleshooting.',
          ],
        },
      ],
    },
    {
      id: 'why',
      title: 'Why we use it',
      blocks: [
        {
          type: 'list',
          items: [
            'To evaluate membership applications and decide who we can work with.',
            'To contact you about onboarding, events, training and Society business.',
            'To deliver the services and community programmes you ask us for.',
            'To keep our website secure, available and free of abuse.',
            'To meet legal, tax or safety obligations that apply to a registered organisation.',
          ],
        },
        { type: 'p', text: 'We do not sell personal data, and we do not share it for advertising. We do not use application data for automated decision-making.' },
      ],
    },
    {
      id: 'legal-basis',
      title: 'Legal basis',
      blocks: [
        { type: 'p', text: 'Where the GDPR or an equivalent regime applies, we rely on your consent (for optional information you choose to provide), the steps taken at your request prior to joining (for an application), our legitimate interest in operating a secure, active community, and compliance with legal obligations.' },
      ],
    },
    {
      id: 'storage',
      title: 'Storage, security and retention',
      blocks: [
        { type: 'p', text: 'Membership records, including uploaded CVs, are held in access-controlled storage that only authorised members of the independent student-led team can open. Files are never published or made publicly downloadable.' },
        { type: 'p', text: 'We keep application records for up to 24 months after an application is decided, then delete them. Declined applications are deleted after 12 months. Correspondence is retained for as long as needed to resolve the matter and to keep a record of Society decisions.' },
        { type: 'p', text: 'No system is perfectly secure, but we treat every team account as a security responsibility and never ask members to share credentials or handle data they are not authorised to handle.' },
      ],
    },
    {
      id: 'sharing',
      title: 'Sharing and processors',
      blocks: [
        { type: 'p', text: 'We share personal data only where it is necessary: with service providers who host our infrastructure and email delivery under written data-processing terms, and where the law requires it. A list of current providers is available on request.' },
        { type: 'p', text: 'We do not sell data, rent mailing lists, or share member details with sponsors, recruiters or third parties for their own purposes.' },
      ],
    },
    {
      id: 'rights',
      title: 'Your rights',
      blocks: [
        {
          type: 'list',
          items: [
            'Ask what personal data we hold about you and get a copy.',
            'Ask us to correct data that is inaccurate or incomplete.',
            'Ask us to delete your data where we have no overriding obligation to keep it.',
            'Object to, or ask us to restrict, processing based on legitimate interest.',
            'Withdraw consent at any time for anything that relies on it.',
            'Complain to your local data protection authority.',
          ],
        },
        { type: 'p', text: 'Send any request to us and a member of the team will respond within 30 days. We may ask you to confirm your identity before we act on the request.' },
      ],
    },
    {
      id: 'cookies',
      title: 'Cookies and local storage',
      blocks: [
        { type: 'p', text: 'This site uses a small amount of local storage to remember your theme preference. It is never used to track you across other websites, and we do not run advertising or analytics cookies. If analytics are introduced later, this policy will be updated before they are enabled.' },
      ],
    },
    {
      id: 'children',
      title: 'Children',
      blocks: [
        { type: 'p', text: 'The Society is not directed at children under 16. If we learn that data was submitted by someone under 16, we delete it. Where a minor applies with a parent or guardian\'s involvement, we handle the record with that consent.' },
      ],
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      blocks: [
        { type: 'p', text: 'When this policy changes we update the date at the top of this page and, for material changes, notify members through the community channels before the change takes effect.' },
      ],
    },
  ],
}

export const termsOfService: LegalDocument = {
  slug: 'terms',
  title: 'Terms of Service',
  description: 'The terms that govern your use of this website, your membership application, and your participation in Society activities.',
  updated: UPDATED,
  appliesTo: 'This website and all Society activities',
  summary: [
    'The Society is independent and student-led. Membership is unpaid and voluntary, and is not employment, a consultancy contract or a guarantee of any service.',
    'Only test systems you own or have written permission to test.',
    'If you find a vulnerability in Society infrastructure, report it to us privately and give us reasonable time to fix it before disclosing it.',
  ],
  sections: [
    {
      id: 'acceptance',
      title: 'Acceptance',
      blocks: [
        { type: 'p', text: 'By using this website, submitting a membership application, or taking part in a Cyber Guardian Society activity, you agree to these terms. If you do not agree, please stop using the site and do not apply.' },
        { type: 'p', text: 'These terms apply alongside our Privacy Policy and Code of Conduct, both of which form part of this agreement.' },
      ],
    },
    {
      id: 'about',
      title: 'About the Society',
      blocks: [
        { type: 'p', text: 'Cyber Guardian Society is an independent student-led cybersecurity community. It is led by students and practitioners and is not a commercial vendor. Membership is an unpaid, voluntary commitment to a community of practice, not an employment relationship, a consultancy contract, or a guarantee of any service.' },
      ],
    },
    {
      id: 'membership',
      title: 'Membership',
      blocks: [
        {
          type: 'list',
          items: [
            'Membership is granted after an application is reviewed against our Code of Conduct.',
            'Membership is personal, non-transferable, and may be suspended or withdrawn when these terms or the Code of Conduct are not upheld.',
            'Members are expected to participate honestly, complete assigned responsibilities, and represent the Society professionally.',
            'Members may resign at any time by notifying the Society; we delete or archive personal data in line with the Privacy Policy.',
          ],
        },
      ],
    },
    {
      id: 'acceptable-use',
      title: 'Acceptable use',
      blocks: [
        { type: 'p', text: 'You agree not to use the website, community channels, or Society resources to:' },
        {
          type: 'list',
          items: [
            'Break the law, or encourage or enable others to break the law.',
            'Carry out unauthorised testing, scanning or access to systems you do not own or have written permission to assess.',
            'Distribute malware, ransomware, or harmful code, or publish exploit details intended to cause harm without responsible disclosure.',
            'Harass, threaten, discriminate against, or impersonate any member or visitor.',
            'Exfiltrate, resell, or publish member data, private research, or other people\'s personal information.',
            'Spam, scrape the site at scale, or attempt to disrupt the service.',
          ],
        },
      ],
    },
    {
      id: 'intellectual-property',
      title: 'Intellectual property',
      blocks: [
        { type: 'p', text: 'Content published by the Society — research write-ups, frameworks, curricula, and documentation — is owned by the Society and its contributing members. You may quote it with clear attribution and link to the original.' },
        { type: 'p', text: 'You keep ownership of work you bring to the Society. By contributing it to a Society project, you grant the Society a non-exclusive licence to use it internally and, where published, to publish it under a licence the project states.' },
      ],
    },
    {
      id: 'security',
      title: 'Security and disclosure',
      blocks: [
        { type: 'p', text: 'Nothing on this website is professional security advice for your specific systems. Research is shared for defensive education. Always obtain written authorisation before testing a system you do not own.' },
        { type: 'p', text: 'If you discover a vulnerability in Society infrastructure, report it privately to us and give us reasonable time to fix it before disclosing it publicly.' },
      ],
    },
    {
      id: 'liability',
      title: 'Disclaimer and liability',
      blocks: [
        { type: 'p', text: 'The website and Society materials are provided "as is", without warranties of any kind. To the extent permitted by law, the Society is not liable for indirect or consequential loss arising from your use of the site or reliance on its content.' },
        { type: 'p', text: 'Nothing in these terms limits liability that cannot lawfully be limited, including for fraud or for death or personal injury caused by negligence.' },
      ],
    },
    {
      id: 'third-parties',
      title: 'Third-party links',
      blocks: [
        { type: 'p', text: 'The site may link to external sites. We do not control them and are not responsible for their content, availability, or privacy practices. Following an external link is at your own discretion.' },
      ],
    },
    {
      id: 'changes',
      title: 'Changes and termination',
      blocks: [
        { type: 'p', text: 'We may update these terms; material changes will be announced through the community channels. Continued use of the site after a change means you accept the updated terms. We may suspend access to anyone who breaches these terms or the Code of Conduct.' },
      ],
    },
    {
      id: 'contact',
      title: 'Contact',
      blocks: [
        { type: 'p', text: 'Questions about these terms can be sent to us through the contact page. Our independent student-led team reads every message and replies as soon as we can.' },
      ],
    },
  ],
}

export const codeOfConduct: LegalDocument = {
  slug: 'code-of-conduct',
  title: 'Code of Conduct',
  description: 'The standard of behaviour every member agrees to — and what happens when it is not met.',
  updated: UPDATED,
  appliesTo: 'This website and all Society activities',
  summary: [
    'Be respectful, honest and professional in every Society space, from events and workshops to community channels and project work.',
    'Report a concern to any member of the coordination team or through the contact page. We aim to acknowledge reports within three working days.',
    'Every report is reviewed confidentially, and retaliation against anyone who reports in good faith is itself a breach of this Code.',
  ],
  sections: [
    {
      id: 'commitment',
      title: 'Our commitment',
      blocks: [
        { type: 'p', text: 'Cyber Guardian Society exists so defenders can trust each other. That trust depends on every member behaving professionally, respectfully and honestly. We are an independent student-led cybersecurity community, and every member holds themselves to the same standard as anyone else.' },
        { type: 'p', text: 'This Code applies in every Society space: events, workshops, community channels, project work, and any place where someone represents the Society.' },
      ],
    },
    {
      id: 'expected',
      title: 'Expected behaviour',
      blocks: [
        {
          type: 'list',
          items: [
            'Be respectful, considerate and inclusive in every interaction.',
            'Assume good intent, and give feedback directly, privately and constructively.',
            'Protect confidential information — members\' details, research, and internal discussions stay internal.',
            'Take responsibility for your commitments; flag early when you cannot deliver.',
            'Represent the Society honestly; never speak on its behalf without permission.',
            'Compete fairly, and play only within authorised environments.',
          ],
        },
      ],
    },
    {
      id: 'unacceptable',
      title: 'Unacceptable behaviour',
      blocks: [
        {
          type: 'list',
          items: [
            'Harassment, intimidation, discrimination, or degrading remarks of any kind.',
            'Deliberate misuse of a member\'s identity, credentials, or access.',
            'Sharing private information, research, or recordings without consent.',
            'Publishing others\' vulnerabilities, personal data, or private conversations without authorisation.',
            'Encouraging, instructing, or enabling the harmful activities listed in our Terms of Service.',
            'Abuse of position — for example using a Society role to obtain unauthorised access.',
          ],
        },
      ],
    },
    {
      id: 'reporting',
      title: 'Reporting a concern',
      blocks: [
        { type: 'p', text: 'If you experience or witness behaviour that breaks this Code, report it to any member of the coordination team, or through the contact page. You may ask to remain anonymous, though that can limit what we can do.' },
        { type: 'p', text: 'We aim to acknowledge a report within three working days and to keep everyone involved informed of the outcome.' },
      ],
    },
    {
      id: 'enforcement',
      title: 'How we respond',
      blocks: [
        { type: 'p', text: 'We review every report confidentially. Depending on what happened, the response may include a private word, a documented warning, temporary removal from a channel or project, suspension, or permanent removal from the Society.' },
        { type: 'p', text: 'Retaliation against anyone who reports a concern in good faith or helps with a review is itself a breach of this Code.' },
      ],
    },
    {
      id: 'scope',
      title: 'Scope and review',
      blocks: [
        { type: 'p', text: 'This Code applies to members, applicants, guests and anyone acting on behalf of the Society. We review it annually and whenever a serious incident shows it needs work.' },
      ],
    },
    {
      id: 'attribution',
      title: 'Attribution',
      blocks: [
        { type: 'p', text: 'This Code is adapted from the Citizen Code of Conduct, widely used by open technical communities, and follows the structure of the Covenant House Project.' },
      ],
    },
  ],
}

export const legalDocuments = {
  privacy: privacyPolicy,
  terms: termsOfService,
  codeOfConduct,
} as const

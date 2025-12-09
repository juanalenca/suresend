async function verify() {
    const baseUrl = 'http://localhost:3000';

    console.log('--- Verifying Contact Management ---');

    // 1. Create Contact
    console.log('\n1. Creating Contact...');
    try {
        const createRes = await fetch(`${baseUrl}/contacts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: `test-${Date.now()}@example.com`,
                name: 'Test User',
                tags: ['manual']
            })
        });
        console.log('Status:', createRes.status);
        const created = await createRes.json();
        console.log('Result:', created);
    } catch (e) {
        console.error('Create failed:', e);
    }

    console.log('\n--- Verifying Campaign Management ---');

    // 2. Create Campaign
    console.log('\n2. Creating Campaign...');
    let campaignId = '';
    try {
        const createRes = await fetch(`${baseUrl}/campaigns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Internal Name',
                subject: 'Hello World Campaign',
                body: '<h1>Hello!</h1>'
            })
        });
        console.log('Status:', createRes.status);
        const created = await createRes.json();
        console.log('Result:', created);
        if (created && created.id) campaignId = created.id;
    } catch (e) {
        console.error('Create Campaign failed:', e);
    }

    // 3. List Campaigns
    console.log('\n3. Listing Campaigns...');
    try {
        const listRes = await fetch(`${baseUrl}/campaigns`);
        console.log('Status:', listRes.status);
        const list = await listRes.json();
        console.log('Result Count:', list.length);
    } catch (e) {
        console.error('List Campaigns failed:', e);
    }

    // 4. Send Campaign
    if (campaignId) {
        console.log('\n4. Sending Campaign...');
        try {
            const sendRes = await fetch(`${baseUrl}/campaigns/${campaignId}/send`, {
                method: 'POST'
            });
            console.log('Status:', sendRes.status);
            const result = await sendRes.json();
            console.log('Result:', result);
        } catch (e) {
            console.error('Send Campaign failed:', e);
        }
    }
}

verify().catch(console.error);

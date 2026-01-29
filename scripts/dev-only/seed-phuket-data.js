const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const PHUKET_DISTRICTS = [
    'Bang Tao', 'Patong', 'Thalang', 'Kamala', 'Rawai', 'Karon', 'Kata',
    'Chalong', 'Panwa', 'Phuket Town', 'Mai Khao', 'Airport', 'Nai Thon', 'Ao Po'
];

const HOTELS_DATA = {
    'Bang Tao': [
        'SAii Laguna Phuket', 'Angsana Laguna Phuket', 'Banyan Tree Phuket',
        'Dusit Thani Laguna Phuket', 'Cassia Phuket', 'Outrigger Laguna Phuket',
        'Trichada Azure', 'The Pavilions Phuket', 'Movenpick Resort Bangtao',
        'Sunwing Bangtao Beach', 'Best Western Premier Bangtao', 'Amora Beach Resort',
        'Pai Tan Villas', 'Chabana Kamala Hotel', 'Diamond Resort Phuket'
    ],
    'Patong': [
        'Phuket Marriott Resort Merlin Beach', 'Amari Phuket', 'Four Points by Sheraton Patong',
        'IndoChine Resort', 'Kalim Resort', 'Wyndham Grand Phuket Kalim',
        'The Kee Resort', 'Patong Mermaid Hotel', 'Burasari Phuket', 'Holiday Inn Resort Patong',
        'The Bloc Hotel', 'Lub d Phuket Patong', 'Grand Mercure Phuket Patong',
        'Banyan Tree Spa Sanctuary', 'crest resort and pool villas'
    ],
    'Thalang': [
        'Anantara Layan Phuket', 'Trisara', 'The Slate Phuket', 'Renaissance Phuket Resort',
        'JW Marriott Phuket', 'Sala Phuket Mai Khao', 'Pullman Phuket Arcadia',
        'Mission Hills Phuket Golf Resort', 'Thanyapura Sports & Health Resort',
        'United 21 Royal Heritage', 'At Panta Phuket', 'Phuket Pavilions',
        'Como Point Yamu', 'Baan Yamu Residences', 'The Naka Island Resort'
    ],
    'Panwa': [
        'Sri Panwa Phuket', 'Pullman Phuket Panwa Beach Resort', 'Cape Panwa Hotel',
        'Amatara Welleisure Resort', 'Bandara Phuket Beach Resort', 'The Bay Exclusive',
        'Cloud19 Panwa', 'Kantary Bay Hotel Phuket', 'Bel Air Panwa',
        'Panwa Boutique Beach Resort', 'My Beach Resort', 'The Mangrove Panwa Phuket',
        'V-Villa Phuket MGallery', 'Namu Panwa', 'Phuket Boat Quay'
    ],
    'Airport': [
        'Phuket Airport Hotel', 'Louis\' Runway View Hotel', 'Perennial Resort',
        'Maya Phuket Hotel', 'Proud Phuket', 'Splash Beach Resort', 'Grand West Sands'
    ],
    'Nai Thon': [
        'Pullman Phuket Arcadia Naithon Beach', 'Andaman White Beach Resort',
        'Naithonburi Beach Resort', 'The Vista @ Naithon', 'Trisara Villas'
    ],
    'Ao Po': [
        'The Naka Island, a Luxury Collection Resort', 'Chandara Resort & Spa',
        'Ao Po Grand Marina', 'The Village Coconut Island'
    ],
    'Kamala': [
        'InterContinental Phuket Resort', 'Keemala', 'Twinpalms MontAzure',
        'Novotel Phuket Kamala Beach', 'Cape Sienna', 'Sunprime Kamala Beach'
    ],
    'Rawai': [
        'The Nai Harn', 'Sunsuri Phuket', 'Stay Wellbeing & Lifestyle Resort',
        'Vijitt Resort Phuket', 'Navatara Phuket Resort'
    ],
    'Karon': [
        'Movenpick Resort & Spa Karon', 'Hilton Phuket Arcadia', 'Thavorn Palm Beach',
        'Centara Grand Beach Resort', 'Le Meridien Phuket Beach Resort'
    ],
    'Kata': [
        'The Shore at Katathani', 'Katathani Phuket Beach Resort', 'Beyond Resort Kata',
        'The Boathouse Phuket', 'Metadee Concept Hotel'
    ],
    'Chalong': [
        'The Vijitt Resort', 'Baan Chalong', 'Ibis Phuket Kata',
        'Coconut Village Resort', 'Fishermans Way Beach Villa'
    ],
    'Phuket Town': [
        'The Memory at On On Hotel', 'Courtyard by Marriott Phuket Town',
        'The Westin Siray Bay Resort', 'Novotel Phuket Phokeethra'
    ],
    'Mai Khao': [
        'Anantara Mai Khao Phuket Villas', 'Avani+ Mai Khao Phuket',
        'SALA Phuket Mai Khao Beach', 'The Slate'
    ]
};

async function seed() {
    console.log('Connecting to DB...');

    // 1. Get Phuket Location ID
    const { data: location } = await supabase
        .from('locations')
        .select('id')
        .eq('name', 'Phuket')
        .single();

    if (!location) {
        console.error('Phuket location not found');
        return;
    }
    const locationId = location.id;
    console.log(`Found Phuket Location ID: ${locationId}`);

    // 2. Clear old mapping or deactivate
    console.log('Deactivating all Phuket districts...');
    await supabase.from('districts').update({ is_active: false }).eq('location_id', locationId);

    const districtMap = {};

    // 3. Upsert districts
    for (const districtName of PHUKET_DISTRICTS) {
        const { data: district, error } = await supabase
            .from('districts')
            .upsert({
                name: districtName,
                location_id: locationId,
                is_active: true
            }, { onConflict: 'name,location_id' })
            .select()
            .single();

        if (error) {
            console.error(`Error upserting district ${districtName}:`, error);
            continue;
        }
        districtMap[districtName] = district.id;
    }

    // 4. Upsert hotels with filling to 500
    console.log('Upserting hotels...');
    const hotelsInSeed = [];

    // Initial batch from data
    for (const [districtName, hotels] of Object.entries(HOTELS_DATA)) {
        const districtId = districtMap[districtName];
        if (!districtId) continue;

        for (const hotelName of hotels) {
            hotelsInSeed.push({
                name: hotelName,
                district_id: districtId,
                location_id: locationId,
                is_active: true
            });
        }
    }

    // Fill to 500
    const currentCount = hotelsInSeed.length;
    const targetCount = 500;
    const remaining = targetCount - currentCount;
    const districtNames = Object.keys(HOTELS_DATA);

    for (let i = 0; i < remaining; i++) {
        const districtName = districtNames[i % districtNames.length];
        const districtId = districtMap[districtName];
        hotelsInSeed.push({
            name: `${districtName} Hotel #${Math.floor(i / districtNames.length) + 2}`,
            district_id: districtId,
            location_id: locationId,
            is_active: true
        });
    }

    // Deactivate all Phuket hotels first to ensure sync
    await supabase.from('hotels').update({ is_active: false }).eq('location_id', locationId);

    // Upsert in batches of 50
    for (let i = 0; i < hotelsInSeed.length; i += 50) {
        const batch = hotelsInSeed.slice(i, i + 50);
        const { error } = await supabase
            .from('hotels')
            .upsert(batch, { onConflict: 'name,location_id' });

        if (error) {
            console.error('Error upserting hotel batch:', error);
        }
    }

    // 5. Cleanup: Delete truly inactive districts if they have no dependency 
    // (Actually better just leave them is_active=false for safety unless we really want them gone)
    // The user had an error with 'Panwa', so I already merged it manually in Turn 1718.

    console.log(`✅ Finished seeding. Total hotels in seed: ${hotelsInSeed.length}`);
}

seed().catch(console.error);

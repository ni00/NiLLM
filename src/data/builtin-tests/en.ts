import { TestSet } from '@/lib/types'

export const BUILTIN_TESTS_EN: TestSet[] = [
    {
        id: 'builtin-logic',
        name: 'Logical Reasoning',
        createdAt: 0,
        cases: [
            {
                id: 'l1',
                prompt: 'If all bloops are blips and some blips are blops, are all bloops necessarily blops?'
            },
            {
                id: 'l2',
                prompt: 'A man has 53 socks, 21 identical blue, 15 identical black and 17 identical red. How many socks must he pull out to guarantee he has a pair?'
            },
            {
                id: 'l3',
                prompt: 'Sally has 3 brothers. Each brother has 2 sisters. How many sisters does Sally have?'
            },
            {
                id: 'l4',
                prompt: 'Which word does not belong: Apple, Banana, Potato, Cherry, Orange?'
            },
            {
                id: 'l5',
                prompt: 'If 5 machines take 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?'
            }
        ]
    },
    {
        id: 'builtin-creative',
        name: 'Creative Writing',
        createdAt: 0,
        cases: [
            {
                id: 'c1',
                prompt: 'Write a short story about a toaster that discovers it can travel through time.'
            },
            {
                id: 'c2',
                prompt: 'Write a poem about the color of the wind in a cybernetic future.'
            },
            {
                id: 'c3',
                prompt: 'Imagine a new animal: describe its appearance, habitat, and one unique survival mechanism.'
            },
            {
                id: 'c4',
                prompt: 'Create a dialogue between a philosopher and a smart fridge about the meaning of "expired".'
            },
            {
                id: 'c5',
                prompt: 'Write a tagline for a company that sells "bottled silence".'
            }
        ]
    },
    {
        id: 'builtin-coding',
        name: 'Coding & Algorithmic',
        createdAt: 0,
        cases: [
            {
                id: 'cd1',
                prompt: 'Write a Python function to check if a string is a palindrome, but you cannot use string slicing or the word "reverse".'
            },
            {
                id: 'cd2',
                prompt: 'Explain the difference between a REST API and a GraphQL API using an analogy that a 10-year-old would understand.'
            },
            {
                id: 'cd3',
                prompt: 'Write a CSS-only solution to center a div both vertically and horizontally.'
            },
            {
                id: 'cd4',
                prompt: 'Optimize this SQL query for performance: SELECT * FROM users WHERE last_login > "2023-01-01" ORDER BY name ASC.'
            },
            {
                id: 'cd5',
                prompt: "Explain how React's Virtual DOM works in three simple sentences."
            }
        ]
    },
    {
        id: 'builtin-roleplay',
        name: 'Professional Contexts',
        createdAt: 0,
        cases: [
            {
                id: 'r1',
                prompt: 'You are a senior HR manager. Draft a polite but firm rejection email for a candidate who was well-qualified but lacked "cultural fit".'
            },
            {
                id: 'r2',
                prompt: 'Act as a customer support agent. A customer is angry because their package arrived damaged. Resolve the situation.'
            },
            {
                id: 'r3',
                prompt: 'You are a VC investor. Give me a 2-minute elevator pitch for a startup that replaces all lawyers with AI.'
            },
            {
                id: 'r4',
                prompt: 'Write a formal apology for a small business that accidentally leaked its customer email list.'
            },
            {
                id: 'r5',
                prompt: 'As a travel agent, plan a 3-day "hidden gems" itinerary for Tokyo.'
            }
        ]
    },
    {
        id: 'builtin-image-gen',
        name: 'Image Generation',
        createdAt: 0,
        cases: [
            {
                id: 'ig1',
                prompt: 'A golden retriever puppy sitting in a field of sunflowers, soft afternoon sunlight, shallow depth of field, professional photography.'
            },
            {
                id: 'ig2',
                prompt: 'A cozy Japanese ramen shop on a rainy night, warm lantern glow reflecting on wet cobblestone streets, Studio Ghibli inspired anime style.'
            },
            {
                id: 'ig3',
                prompt: 'A futuristic cyberpunk cityscape at sunset, neon signs with readable text "OPEN 24/7" and "RAMEN", flying cars, dramatic clouds.'
            },
            {
                id: 'ig4',
                prompt: 'An astronaut riding a horse on the surface of Mars, Earth visible in the background sky, hyper-realistic digital art.'
            },
            {
                id: 'ig5',
                prompt: 'A cute robot making coffee in a kitchen, watercolor painting style, pastel colors, whimsical and charming atmosphere.'
            },
            {
                id: 'ig6',
                prompt: 'An ancient Chinese ink wash painting of misty mountains with a lone fisherman on a bamboo raft, minimalist composition.'
            },
            {
                id: 'ig7',
                prompt: 'A glass sphere on a wooden table reflecting an entire fantasy landscape with castles and dragons, macro photography, crystal clear details.'
            },
            {
                id: 'ig8',
                prompt: 'A photorealistic portrait of a cat wearing a tiny crown and royal cape, sitting on a velvet throne, Renaissance oil painting style.'
            }
        ]
    }
]

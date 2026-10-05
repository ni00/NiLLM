export const exampleResponse = {
    model: 'jev-1.13.0',
    answers: {
        department: {
            type: 'choice',
            choice: 'billing',
            probabilities: { billing: 0.9, technical: 0.1, sales: 0 },
            confidence: 0.8
        },
        urgent: { type: 'noul', noul: 0.95 },
        urgency: {
            type: 'score',
            score: 1.95,
            probabilities: { '0': 0, '1': 0.05, '2': 0.95 },
            confidence: 0.9,
            legend: { '0': 'No deadline', '1': 'This week', '2': 'Today' }
        }
    }
}

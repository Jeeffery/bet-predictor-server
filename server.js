const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

async function getTeamStats(teamName) {
    const teamResponse = await axios.get(`${BASE_URL}/teams`, {
        params: { search: teamName },
        headers: { 'x-apisports-key': API_KEY }
    });

    const team = teamResponse.data.response[0];
    const teamId = team.team.id;

    const fixturesResponse = await axios.get(`${BASE_URL}/fixtures`, {
        params: {
            team: teamId,
            last: 5
        },
        headers: { 'x-apisports-key': API_KEY }
    });

    const matches = fixturesResponse.data.response;

    let wins = 0, draws = 0, losses = 0, totalGoals = 0;

    matches.forEach(match => {
        const goalsFor = match.teams.home.id === teamId ? match.goals.home : match.goals.away;
        const goalsAgainst = match.teams.home.id === teamId ? match.goals.away : match.goals.home;

        totalGoals += goalsFor + goalsAgainst;

        if (goalsFor > goalsAgainst) wins++;
        else if (goalsFor === goalsAgainst) draws++;
        else losses++;
    });

    return {
        name: team.team.name,
        wins,
        draws,
        losses,
        avgGoals: totalGoals / 5
    };
}

app.post('/predict', async (req, res) => {
    const { team1, team2 } = req.body;

    try {
        const t1 = await getTeamStats(team1);
        const t2 = await getTeamStats(team2);

        let prediction = `
${t1.name}: ${t1.wins}W - ${t1.draws}D - ${t1.losses}L | Avg Goals: ${t1.avgGoals.toFixed(2)}\n
${t2.name}: ${t2.wins}W - ${t2.draws}D - ${t2.losses}L | Avg Goals: ${t2.avgGoals.toFixed(2)}\n
`;

        if (t1.avgGoals > 2 || t2.avgGoals > 2) {
            prediction += "✅ Likely Over 2.5 Goals.\n";
        } else {
            prediction += "🔒 Possible Under 2.5 Goals.\n";
        }

        if (t1.avgGoals > 1 && t2.avgGoals > 1) {
            prediction += "🤝 BTTS (Both Teams to Score): Likely.\n";
        } else {
            prediction += "🙅‍♂️ BTTS: Unlikely.\n";
        }

        res.json({ prediction });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ prediction: 'Error generating prediction. Please check team names.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

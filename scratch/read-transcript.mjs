import fs from 'fs';
import readline from 'readline';

const logPath = 'C:\\Users\\titan\\.gemini\\antigravity-ide\\brain\\4d07eeee-9657-4f11-aaf2-97e6936899ca\\.system_generated\\logs\\transcript.jsonl';

async function readLastLines() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const userInputs = [];
    for await (const line of rl) {
        try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'USER_INPUT') {
                userInputs.push(parsed);
            }
        } catch (e) {
            // ignore
        }
    }

    console.log(`Found ${userInputs.length} user inputs.`);
    const recent = userInputs.slice(-10);
    recent.forEach((parsed) => {
        console.log(`[Step ${parsed.step_index}] USER INPUT:`);
        console.log(parsed.content);
        console.log("-----------------------------------------");
    });
}
readLastLines();

import fs from 'fs';
import readline from 'readline';

const logPath = 'C:\\Users\\titan\\.gemini\\antigravity-ide\\brain\\4d07eeee-9657-4f11-aaf2-97e6936899ca\\.system_generated\\logs\\transcript.jsonl';

async function readRange() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const steps = [];
    for await (const line of rl) {
        try {
            steps.push(JSON.parse(line));
        } catch (e) {}
    }

    const filtered = steps.filter(s => s.step_index >= 1163 && s.step_index <= 1227);
    filtered.forEach((step) => {
        console.log(`[Step ${step.step_index}] Source: ${step.source}, Type: ${step.type}`);
        if (step.content) {
            console.log(`Content:\n${step.content.substring(0, 300)}`);
        }
        if (step.tool_calls) {
            console.log(`Tool Calls: ${JSON.stringify(step.tool_calls)}`);
        }
        console.log("=========================================");
    });
}
readRange();

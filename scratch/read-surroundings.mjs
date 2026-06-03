import fs from 'fs';
import readline from 'readline';

const logPath = 'C:\\Users\\titan\\.gemini\\antigravity-ide\\brain\\4d07eeee-9657-4f11-aaf2-97e6936899ca\\.system_generated\\logs\\transcript.jsonl';

async function readSurroundings() {
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

    // Find the step where the user said: "now what happened to the usage example"
    let targetIdx = -1;
    for (let i = 0; i < steps.length; i++) {
        if (steps[i].content && steps[i].content.includes('now what happened to the usage example')) {
            targetIdx = i;
            break;
        }
    }

    if (targetIdx !== -1) {
        console.log(`Found target at index ${targetIdx} (Step ${steps[targetIdx].step_index})`);
        const start = Math.max(0, targetIdx - 15);
        const end = Math.min(steps.length, targetIdx + 5);
        for (let i = start; i < end; i++) {
            const step = steps[i];
            console.log(`[Step ${step.step_index}] Source: ${step.source}, Type: ${step.type}`);
            if (step.content) {
                console.log(`Content:\n${step.content.substring(0, 300)}`);
            }
            if (step.tool_calls) {
                console.log(`Tool Calls: ${JSON.stringify(step.tool_calls)}`);
            }
            console.log("=========================================");
        }
    } else {
        console.log("Could not find the target user message.");
    }
}
readSurroundings();

const fs = require('fs');

const API_KEY = process.env.API_KEY;
const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

const PROMPT = 'Traduza os textos a seguir para o Português do Brasil, mantendo a estrutura original e evitando o uso de tags <i>. Utilize o padrão de tradução XSC 1 e retorne as traduções no formato especificado: ';
const testText = ` <TR IDX:"1" TXT:"Forgive me!" TR><TR IDX:"2" TXT:"Ha! So that's all for you, executioner." TR><TR IDX:"3" TXT:"Y-You monster..." TR><TR IDX:"4" TXT:"<i>My tears scattered like bits of paper</i>" TR><TR IDX:"5" TXT:"<i>Scared of the unknowable tomorrow</i>" TR>`;

async function askToTranslateGPT(textToTranslate) {
    const answer = `${PROMPT}${textToTranslate}`;
    
    const requestOptions = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            "messages": [{ "role": "user", "content": answer }],
            "temperature": 0.7
        })
    };
    console.log('Iniciando tradução ...');
    const data = await fetch(ENDPOINT, requestOptions);
    const response = await data.json();
    console.log('Tradução finalizada...');

    return response.choices[0].message.content;
}


function extractDataFromString(str) {
    const regex = /<TR IDX:"(\d+)" TXT:"(.*?)" TR>/g;
    const results = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
        results.push({
            index: parseInt(match[1], 10),
            text: match[2]
        });
    }
    return results;
}

function updateDataArray(dataArray, stringData) {
    const extractedData = extractDataFromString(stringData);

    for (const data of extractedData) {
        const found = dataArray.find(item => parseInt(item.index) === parseInt(data.index));
        if (found) {
            found.text = data.text;
        }
    }
}

async function translate(blocks) {

    const textsToTranslate = [];
    let count = 1;

    let currentText = '';
    for (const block of blocks) {
        if (count == 15) {
            textsToTranslate.push(currentText);
            count = 1;
            currentText = '';
        }
        currentText += `<TR IDX:"${block.index}" TXT:"${block.text}" TR>`;
        count++;
    }
    textsToTranslate.push(currentText);
    console.log(`Se preparando para traduzir ... ${textsToTranslate.length}`);
    const responses = await Promise.all(textsToTranslate.map((el) => askToTranslateGPT(el)));
    
    console.log('Gerando arquivos');
    for (const translatedText of responses) {
        updateDataArray(blocks, translatedText);
    }
    return blocks;
}

function breakInBlocks(path) {

    const content = fs.readFileSync(path, 'utf-8');
    const blocks = content.split(/\n{2,}/).map(block => {
        const lines = block.split('\n');

        return {
            index: lines[0],
            time: lines[1],
            text: lines.slice(2).join('\n')
        }
    });

    console.log(`Total de Blocks para buscar: ${blocks.length}`);
    return blocks;
}


function generateSrt(data, inputPath) {
    let srtContent = '';

    for (const entry of data) {
        srtContent += `${entry.index}\n${entry.time}\n${entry.text}\n\n`;
    }
    
    let replaceBy = '.str';
    if(inputPath.includes('.en.str')){
        replaceBy = '.en.str';
    } else if(inputPath.includes('.en.forced.str')){
        replaceBy = '.en.forced.str';
    }

    const filepath = inputPath.replace(replaceBy, '.pt-BR.srt');

    fs.openSync(filepath, 'w');
    fs.writeFileSync(filepath, srtContent);
}

const args = process.argv.slice(2);

const inputPath = args[0];
const blocks = breakInBlocks(inputPath);
translate(blocks).then((blocks) => {
    generateSrt(blocks, inputPath);
});


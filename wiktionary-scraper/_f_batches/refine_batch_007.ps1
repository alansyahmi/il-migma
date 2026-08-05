# Process batch_007.jsonl - Maltese lexicographic refinement
$inputPath = "c:\Projects\il-migma\wiktionary-scraper\_f_batches\batch_007.jsonl"
$outputPath = "c:\Projects\il-migma\wiktionary-scraper\_f_batches\refined\batch_007.jsonl"

# Approved tags
$approvedTags = @(
    "common", "rare", "archaic", "neologism", "purist", "formal", "literary",
    "colloquial", "obsolete", "technical", "dialectal", "gozitan", "slang",
    "vulgar", "euphemistic", "figurative", "pejorative", "childish",
    "agriculture", "anatomy", "animals", "architecture", "art", "astronomy",
    "sea", "botany", "geography", "food", "commerce", "family", "physics",
    "war", "law", "mathematics", "medicine", "music", "politics", "religion",
    "crafts", "sports", "technology", "weather", "transport", "time"
)

# Tag name mapping (non-approved → approved)
$tagMap = @{
    "figuratively" = "figurative"
}

# UK English spelling map
$ukMap = @{
    "scrutinize" = "scrutinise"
    "analyze" = "analyse"
    "realize" = "realise"
    "recognize" = "recognise"
    "color" = "colour"
    "favor" = "favour"
    "honor" = "honour"
    "labor" = "labour"
    "neighbor" = "neighbour"
    "center" = "centre"
    "meter" = "metre"
    "liter" = "litre"
    "defense" = "defence"
    "offense" = "offence"
    "license" = "licence"
    "practice" = "practise"
    "traveled" = "travelled"
    "canceled" = "cancelled"
    "marvelous" = "marvellous"
}

$results = @()

Get-Content $inputPath | ForEach-Object {
    if ([string]::IsNullOrWhiteSpace($_)) { return }

    $obj = $_ | ConvertFrom-Json

    # Remove _scratchpad
    $obj.PSObject.Properties.Remove('_scratchpad')

    $entry = $obj.entry
    $headword = $entry.headword
    $pos = $entry.pos

    # ========== FILL text_mt ==========
    foreach ($def in $entry.definitions) {
        if ([string]::IsNullOrEmpty($def.text_mt)) {
            $textEn = $def.text_en

            # Merge split definitions for fejjaq
            if ($headword -eq "fejjaq" -and $pos -eq "verb") {
                # Will handle this below with the merged definitions
            }

            $def.text_mt = ""
        }
    }

    # ========== MERGE SPLIT DEFINITIONS for fejjaq ==========
    if ($headword -eq "fejjaq" -and $pos -eq "verb") {
        $entry.definitions = @(
            @{
                text_en = "to heal, to make sound, to give back health to"
                text_mt = "Ifejjaq lil min hu marid: iġib is-saħħa u l-benesseri lil persuna jew organu."
                register = ""
                nuance = ""
            }
        )
    }

    # ========== FIX COMMON REGISTER ISSUE in feles ==========
    if ($headword -eq "feles") {
        if ($entry.definitions[0].register -eq "arkajku") {
            $entry.definitions[0].register = ""
        }
    }

    # ========== Apply text_mt by headword and POS ==========
    # Entry 1: fehem (verb)
    if ($headword -eq "fehem" -and $pos -eq "verb") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Jifhem xi ħaġa: japprendi t-tifsira, l-iskop jew in-natura ta' xi ħaġa permezz tal-ħsieb."
            }
        }
    }

    # Entry 2: fehim (noun, masculine)
    if ($headword -eq "fehim" -and $pos -eq "noun") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Nom verbali ta' 'fehem': il-proċess jew il-ħila li wieħed jifhem."
            }
        }
    }

    # Entry 3: fehma (noun, feminine)
    if ($headword -eq "fehma") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                if ($def.text_en -eq "opinion") {
                    $def.text_mt = "Ġudizzju jew ħsieb personali dwar xi ħaġa."
                } elseif ($def.text_en -eq "understanding") {
                    $def.text_mt = "Għarfien jew interpretazzjoni ta' xi ħaġa."
                }
            }
        }
    }

    # Entry 4: fejda (noun, feminine)
    if ($headword -eq "fejda") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Vantaġġ jew utilità li wieħed jikseb minn xi ħaġa."
            }
        }
    }

    # Entry 6: fejjiedi (adjective)
    if ($headword -eq "fejjiedi") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Li jġib benefiċċju jew qligħ."
            }
        }
    }

    # Entry 7: fejn (adverb)
    if ($headword -eq "fejn") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "F'liema post, lok jew sitwazzjoni."
            }
        }
    }

    # Entry 8: fejqan (noun, masculine)
    if ($headword -eq "fejqan") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Nom verbali ta' 'fieq': l-irkupru minn marda jew tbatija."
            }
        }
    }

    # Entry 9: fejqien (noun, masculine)
    if ($headword -eq "fejqien") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Nom verbali ta' 'fieq': l-irkupru minn marda jew tbatija."
            }
        }
    }

    # Entry 10: fejt (noun, masculine)
    if ($headword -eq "fejt") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Nom verbali ta' 'fiet': nuqqas ta' suċċess jew telfa."
            }
        }
    }

    # Entry 11: fejġel (noun, masculine)
    if ($headword -eq "fejġel") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Pjanta aromatika perenni tal-ġeneru Ruta, b'weraq griż-ħadrani u fjuri sofor."
            }
        }
    }

    # Entry 12: fejġen (noun, masculine)
    if ($headword -eq "fejġen") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Pjanta aromatika perenni tal-ġeneru Ruta, b'weraq griż-ħadrani u fjuri sofor."
            }
        }
    }

    # Entry 13: fekren (verb)
    if ($headword -eq "fekren") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Jekkren: jimxi bil-mod ħafna u b'kawtela."
            }
        }
    }

    # Entry 14: fekruna (noun, feminine)
    if ($headword -eq "fekruna") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Rettili tal-familja Testudinidae b'qoxra iebsa u riġlejn qosra, li jiċċaqlaq bil-mod."
            }
        }
    }

    # Entry 15: fela (verb)
    if ($headword -eq "fela") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Jifela xi ħaġa: jeżamina b'attenzjoni kbira, iħares lejn kull dettall."
            }
        }
    }

    # Entry 16: felaħ (verb)
    if ($headword -eq "felaħ") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                if ($def.text_en -like "*afford*") {
                    $def.text_mt = "Jiflaħ xi ħaġa: ikollu l-kapaċità finanzjarja jew fiżika biex jagħmel jew jissaporti xi ħaġa."
                } elseif ($def.text_en -like "*fine*healthy*") {
                    $def.text_mt = "Jiflaħ: ikun f'saħħtu, b'saħħtu jew b'suċċess."
                }
            }
        }
    }

    # Entry 17: feles (noun, feminine)
    if ($headword -eq "feles") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                if ($def.text_en -eq "wedge") {
                    $def.text_mt = "Biċċa injama jew metall irqiqa li tintuża biex tifred jew iżżomm żewġ uċuħ."
                } elseif ($def.text_en -like "*splinter*") {
                    $def.text_mt = "Ċiqalfa jew framment żgħir minn xi ħaġa."
                }
            }
        }
        # Fix register
        foreach ($def in $entry.definitions) {
            if ($def.register -eq "arkajku") {
                $def.register = "archaic"
            }
        }
    }

    # Entry 18: fellel (verb)
    if ($headword -eq "fellel") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                if ($def.text_en -like "*slices*") {
                    $def.text_mt = "Jfellel xi ħaġa: jaqtagħha fi flieli rqaq."
                } elseif ($def.text_en -like "*incision*") {
                    $def.text_mt = "Jfellel: jagħmel qatgħa fonda f'xi ħaġa."
                } elseif ($def.text_en -like "*soil*") {
                    $def.text_mt = "Jfellel l-art: ikisser jew iħaffer il-ħamrija."
                }
            }
        }
    }

    # Entry 19: felles (verb)
    if ($headword -eq "felles") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                if ($def.text_en -like "*hatch*") {
                    $def.text_mt = "Jfelles: iħalli l-bajd jitfaqqas u joħorġu l-flieles."
                } elseif ($def.text_en -like "*bud*") {
                    $def.text_mt = "Jfelles: jibda jikber u jagħti l-weraq jew il-friegħi."
                } elseif ($def.text_en -like "*wedge*") {
                    $def.text_mt = "Jfelles: idaħħal feles f'xi ħaġa."
                }
            }
        }
    }

    # Entry 20: felli (noun)
    if ($headword -eq "felli") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                if ($def.text_en -like "*section*") {
                    $def.text_mt = "Sezzjoni jew porzjon maqtugħ minn xi ħaġa."
                } elseif ($def.text_en -like "*crack*") {
                    $def.text_mt = "Xaqq jew qasma fil-ġilda tal-għarqub."
                } elseif ($def.text_en -eq "buttocks") {
                    $def.text_mt = "Il-warrani jew il-ġewż."
                }
            }
        }
    }

    # Entry 21: felliel (noun, masculine)
    if ($headword -eq "felliel") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Persuna jew għodda li taqta' xi ħaġa fi flieli."
            }
        }
    }

    # Entry 22: fellieli (adjective)
    if ($headword -eq "fellieli") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Li jista' jaqta' jew li għandu l-ħila jaqta' fi flieli."
            }
        }
    }

    # Entry 23: fellieħ (adjective)
    if ($headword -eq "fellieħ") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Qawwi, b'saħħtu u robust."
            }
        }
    }

    # Entry 24: fellus (noun, masculine)
    if ($headword -eq "fellus") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                if ($def.text_en -like "*chick*") {
                    $def.text_mt = "Ferd żgħir tat-tiġieġ li għadu kif faqqas."
                } elseif ($def.text_en -like "*suspicion*") {
                    $def.text_mt = "Suspett jew dubju dwar xi ħaġa."
                }
            }
        }
    }

    # Entry 25: felq (noun, masculine)
    if ($headword -eq "felq") {
        foreach ($def in $entry.definitions) {
            if ([string]::IsNullOrEmpty($def.text_mt)) {
                $def.text_mt = "Katina tal-ħadid li tintuża biex torbot saqajn il-ħabs."
            }
        }
    }

    # ========== USAGE EXAMPLES ==========
    $examples = @()

    switch ("$headword|$pos") {
        "fehem|verb" {
            $examples = @(
                @{mt = "Jien fhimt dak li qalli."; en = "I understood what he told me."}
                @{mt = "Ma nifhem xejn minn din il-problema."; en = "I do not understand anything about this problem."}
                @{mt = "Tifhem bit-Taljan?"; en = "Do you understand Italian?"}
            )
        }
        "fehim|noun" {
            $examples = @(
                @{mt = "Il-fehim tiegħu tal-lingwa huwa tajjeb ħafna."; en = "His understanding of the language is very good."}
                @{mt = "Hemm nuqqas ta' fehim bejniethom."; en = "There is a lack of understanding between them."}
            )
        }
        "fehma|noun" {
            $examples = @(
                @{mt = "X'inhi l-fehma tiegħek dwar dan is-suġġett?"; en = "What is your opinion on this subject?"}
                @{mt = "Il-fehmiet tagħna huma differenti."; en = "Our opinions are different."}
            )
        }
        "fejda|noun" {
            $examples = @(
                @{mt = "X'inhi l-fejda ta' dan l-apparat?"; en = "What is the usefulness of this device?"}
                @{mt = "M'hemmx fejda li tmur hemm."; en = "There is no benefit in going there."}
            )
        }
        "fejjaq|verb" {
            $examples = @(
                @{mt = "It-tabib fejjaq lill-marid."; en = "The doctor healed the patient."}
                @{mt = "Dan il-mediċina tfejjaq ħafna mardiet."; en = "This medicine heals many illnesses."}
            )
        }
        "fejjiedi|adjective" {
            $examples = @(
                @{mt = "Dan in-negozju huwa fejjiedi ħafna."; en = "This business is very lucrative."}
                @{mt = "Fittex opportunitajiet fejjiedin."; en = "Look for advantageous opportunities."}
            )
        }
        "fejn|adverb" {
            $examples = @(
                @{mt = "Fejn mort il-bieraħ?"; en = "Where did you go yesterday?"}
                @{mt = "Ma nafx fejn qiegħed."; en = "I do not know where he is."}
            )
        }
        "fejqan|noun" {
            $examples = @(
                @{mt = "Qed nittama għall-fejqan tiegħu."; en = "I am hoping for his recovery."}
                @{mt = "Il-fejqan minn din il-marda jieħu żmien twil."; en = "Recovery from this illness takes a long time."}
            )
        }
        "fejqien|noun" {
            $examples = @(
                @{mt = "Il-fejqien tiegħu kien mill-isbaħ."; en = "His recovery was wonderful."}
                @{mt = "Nixtieqlek fejqien malajr."; en = "I wish you a speedy recovery."}
            )
        }
        "fejt|noun" {
            $examples = @(
                @{mt = "Wara ħafna attentati, kollu fejt."; en = "After many attempts, it was all a failure."}
            )
        }
        "fejġel|noun" {
            $examples = @(
                @{mt = "Il-fejġel għandu riħa qawwija."; en = "Rue has a strong smell."}
                @{mt = "Fil-ġnien tagħna hemm pjanta tal-fejġel."; en = "In our garden there is a rue plant."}
            )
        }
        "fejġen|noun" {
            $examples = @(
                @{mt = "Il-fejġen jikber fix-xatt tax-xmajjar."; en = "Rue grows on riverbanks."}
            )
        }
        "fekren|verb" {
            $examples = @(
                @{mt = "Ix-xwejjaħ fekren lejn il-bieb."; en = "The old man walked very slowly towards the door."}
                @{mt = "Tibdiex tekren, għaġġel ftit!"; en = "Do not walk so slowly, hurry up a bit!"}
            )
        }
        "fekruna|noun" {
            $examples = @(
                @{mt = "Rajt fekruna kbira fil-baħar."; en = "I saw a large turtle in the sea."}
                @{mt = "Il-fekruna ġġorr darha fuq dahru."; en = "The tortoise carries its house on its back."}
            )
        }
        "fela|verb" {
            $examples = @(
                @{mt = "Flejtu sew qabel ma xtrajtu."; en = "I inspected it carefully before buying it."}
                @{mt = "Il-ġojjellier fela d-djamant."; en = "The jeweller scrutinised the diamond."}
            )
        }
        "felaħ|verb" {
            $examples = @(
                @{mt = "Ma jiflaħx jixtri dar ġdida."; en = "He cannot afford to buy a new house."}
                @{mt = "Kif qiegħed? Qed niflaħ, grazzi."; en = "How are you? I am fine, thank you."}
            )
        }
        "feles|noun" {
            $examples = @(
                @{mt = "Daħħal feles biex iżżomm il-bieb miftuħ."; en = "Insert a wedge to keep the door open."}
            )
        }
        "fellel|verb" {
            $examples = @(
                @{mt = "Fellejt il-ħobż għas-sandwix."; en = "I sliced the bread for the sandwich."}
                @{mt = "Il-bidwi fellel l-art qabel ma żera'."; en = "The farmer broke up the soil before sowing."}
            )
        }
        "felles|verb" {
            $examples = @(
                @{mt = "It-tiġieġa felles il-flieles kollha."; en = "The hen hatched all the chicks."}
                @{mt = "Is-siġra bdiet tfelles fir-rebbiegħa."; en = "The tree began to bud in spring."}
            )
        }
        "felli|noun" {
            $examples = @(
                @{mt = "Agħtini felli ieħor tal-ġobon."; en = "Give me another slice of cheese."}
                @{mt = "Qagħad fuq fellieh."; en = "He sat on his buttocks."}
            )
        }
        "felliel|noun" {
            $examples = @(
                @{mt = "Uża dan il-felliel biex taqta' t-tadam."; en = "Use this slicer to cut the tomatoes."}
            )
        }
        "fellieli|adjective" {
            $examples = @(
                @{mt = "Din is-sikkina hija fellielija."; en = "This knife is good for slicing."}
            )
        }
        "fellieħ|adjective" {
            $examples = @(
                @{mt = "Huwa raġel fellieħ u jista' jerfa' piżijiet tqal."; en = "He is a strong man and can lift heavy weights."}
            )
        }
        "fellus|noun" {
            $examples = @(
                @{mt = "It-tiġieġa għandha ħames flieles."; en = "The hen has five chicks."}
                @{mt = "Għandi fellus li mhux se jkun hemm problema."; en = "I have a suspicion that there will not be a problem."}
            )
        }
        "felq|noun" {
            $examples = @(
                @{mt = "Poġġew il-felq f'saqajh."; en = "They put the shackles on his feet."}
                @{mt = "Il-ħabs kien marbut bil-felq."; en = "The prisoner was bound with fetters."}
            )
        }
    }

    $entry.usage_examples = $examples

    # ========== TAG VALIDATION ==========
    # Process tags: remove non-approved, map known variants
    # tags and entry_tags are at the top level of $obj, not inside $entry
    $validTags = @()
    $validEntryTags = @()

    foreach ($tag in $obj.tags) {
        $tagName = $tag.name.ToLower()
        $approvedName = $null

        if ($approvedTags -contains $tagName) {
            $approvedName = $tagName
        } elseif ($tagMap.ContainsKey($tagName)) {
            $approvedName = $tagMap[$tagName]
        }

        if ($approvedName) {
            $newId = "tag-$approvedName"
            $newTag = @{
                id = $newId
                name = $approvedName
                category = $tag.category
                description = $tag.description
            }
            $validTags += $newTag

            # Find corresponding entry_tags
            foreach ($et in $obj.entry_tags) {
                if ($et.tag_id -eq $tag.id) {
                    $validEntryTags += @{
                        entry_id = $et.entry_id
                        tag_id = $newId
                    }
                }
            }
        }
        # Else: non-approved tag is dropped
    }

    $obj.tags = $validTags
    $obj.entry_tags = $validEntryTags

    # ========== UK ENGLISH SPELLING CHECK ==========
    # Check text_en fields for US spellings
    foreach ($def in $entry.definitions) {
        foreach ($us in $ukMap.Keys) {
            if ($def.text_en -match "\b$us\b") {
                $def.text_en = $def.text_en -replace "\b$us\b", $ukMap[$us]
            }
        }
    }

    $results += $obj
}

# Write output
$outputLines = $results | ForEach-Object { $_ | ConvertTo-Json -Depth 100 -Compress }
$outputLines -join "`r`n" | Out-File -FilePath $outputPath -Encoding utf8

Write-Host "Processed $($results.Count) entries. Output written to $outputPath"

$inputPath = "c:\Projects\il-migma\wiktionary-scraper\_g_batches\batch_007.jsonl"
$outputPath = "c:\Projects\il-migma\wiktionary-scraper\_g_batches\refined\batch_007.jsonl"
$outputDir = Split-Path $outputPath -Parent
if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir -Force }

$approvedTags = @(
    "common", "rare", "archaic", "neologism", "purist", "formal", "literary",
    "colloquial", "obsolete", "technical", "dialectal", "gozitan", "slang",
    "vulgar", "euphemistic", "figurative", "pejorative", "childish",
    "agriculture", "anatomy", "animals", "architecture", "art", "astronomy",
    "sea", "botany", "geography", "food", "commerce", "family", "physics",
    "war", "law", "mathematics", "medicine", "music", "politics", "religion",
    "crafts", "sports", "technology", "weather", "transport", "time"
)

$textMtMap = @{
    "n-gramma" = ,"Unit%C3%A0%20tal-pi%C5%BC%20ekwivalenti%20g%C4%A7al%20elf%20wie%C4%A7ed%20ta'%20kilogramm%20(simbolu%20g)"
    "n-grammofonu" = ,"Apparat%20li%20jdoqq%20id-diski%20tal-vinil%20permezz%20ta'%20stilus%20li%20jaqra%20l-%C4%A7oss%20irre%C4%A1istrat"
    "n-gramofown" = ,"Apparat%20li%20jdoqq%20id-diski%20tal-vinil%20permezz%20ta'%20stilus%20li%20jaqra%20l-%C4%A7oss%20irre%C4%A1istrat"
    "n-gran-brittanja" = @("G%C5%BCira%20fil-Majjistral%20tal-Ewropa%20li%20tinkludi%20l-Ingilterra%2C%20l-Iskozja%20u%20Wales","Renju%20Unit%2C%20pajji%C5%BC%20fl-Ewropa%20ta'%20Fuq%20li%20jinkludi%20l-g%C5%BCira%20ta'%20Gran%20Brittanja%20u%20l-Irlanda%20ta'%20Fuq")
    "n-granf" = ,"Sieq%20ta'%20g%C4%A7asfur%20tal-pri%C5%BCa%20jew%20annimal%20kbir%20miksija%20b'dwiefer%20li%20jaqtg%C4%A7u"
    "n-grantork" = ,"Qam%C4%A7irrum%3B%20tip%20ta'%20%C4%87ereali%20bil-qam%C4%A7%20isfar%20u%C5%BCat%20%C4%A7afna%20fl-ikel"
    "n-granza" = ,"Qoxra%20ta'%20barra%20tal-qam%C4%A7%20li%20titne%C4%A7%C4%A7a%20waqt%20it-t%C4%A7in%20u%20tintu%C5%BCa%20g%C4%A7all-g%C4%A7alf%20tal-annimali"
    "n-gran%C4%8B" = ,"Annimal%20tal-ba%C4%A7ar%20bil-qoxra%20iebsa%20u%20b'g%C4%A7axar%20saqajn%20li%20jinstab%20fil-ba%C4%A7ar%20u%20mal-kosta"
    "adj-gravitazzjonali" = ,"Li%20g%C4%A7andu%20x'jaqsam%20mal-gravit%C3%A0%20jew%20ji%C4%A1bed%20lejn%20i%C4%8B-%C4%8Bentru"
    "n-gravit%C3%A0" = @("Stat%20ta'%20serjet%C3%A0%20jew%20importanza%20kbira","Forza%20fi%C5%BCika%20li%20tattira%20l-massa%20lejn%20i%C4%8B-%C4%8Bentru%20ta'%20o%C4%A1%C4%A1ett")
    "n-grawwa" = ,"G%C4%A7asfur%20tar-razza%20tal-grawwi%20(Grus%20grus)%20b'saqajn%20u%20g%C4%A7onq%20twal%20li%20jinsab%20fl-artijiet%20mistag%C4%A7dra"
    "intj-grazzi" = ,"Esklamazzjoni%20ta'%20radd%20il-%C4%A7ajr%20meta%20xi%20%C4%A7add%20jag%C4%A7tik%20xi%20%C4%A7a%C4%A1a"
    "n-grazzja" = ,"Sbu%C4%A7ija%20naturali%20fil-moviment%2C%20fid-dehra%20jew%20fl-im%C4%A1iba%20ta'%20persuna"
    "n-grech" = ,"Kunjata%20ta'%20ori%C4%A1ini%20Griega"
    "n-gredenza" = ,"Bi%C4%8B%C4%8Ba%20g%C4%A7amara%20b'kaxex%20mi%C4%A1buda%20li%20tintu%C5%BCa%20g%C4%A7all-%C4%A7a%C5%BCna%20tal-%C4%A7wejje%C4%A1"
    "n-gremxul" = @("Annimali%20%C5%BCg%C4%A7ar%20tal-familja%20tar-rettili%20b'%C4%A1ilda%20bil-qxur%20u%20erba'%20saqajn","%C4%A6ut%20twil%20u%20rqiq%20b'geddumu%20jixbah%20il-pipa","%C4%A6uta%20tal-familja%20Synodontidae%20li%20tg%C4%A7ix%20fil-qieg%C4%A7%20tal-ba%C4%A7ar")
    "n-gre%C4%8Bja" = ,"Pajji%C5%BC%20fix-Xlokk%20tal-Ewropa%20mag%C4%A7ruf%20g%C4%A7all-istorja%20u%20l-kultura%20antika%20tieg%C4%A7u"
    "adj-grieg" = ,"Tal-Gre%C4%8Bja%2C%20tal-poplu%2C%20tal-lingwa%20jew%20tal-kultura%20Griega"
    "n-grieg" = @("Persuna%20li%20%C4%A1ejja%20mill-Gre%C4%8Bja","Il-lingwa%20mitkellma%20fil-Gre%C4%8Bja%20u%20f'%C4%8Aipru")
    "n-grigal" = @("Punt%20kardinali%20bejn%20it-tramuntana%20u%20l-lvant","Ri%C4%A7%20li%20%C4%A1ej%20mill-grigal")
    "n-grima" = ,"Kunjata%20ta'%20ori%C4%A1ini%20Taljana"
    "adj-grixti" = @("Mhux%20so%C4%8Bjevoli%20jew%20edukat%3B%20li%20jippreferi%20jkun%20wa%C4%A7du%20(persuna)","Salva%C4%A1%C4%A1%20u%20mhux%20domestiku%20(annimal)")
    "n-gri%C4%A1jol" = ,"Va%C5%BCett%20re%C5%BCistenti%20g%C4%A7as-s%C4%A7ana%20u%C5%BCat%20biex%20idubu%20l-metalli%20fih"
    "adj-gri%C5%BC" = ,"Kulur%20bejn%20l-abjad%20u%20l-iswed"
    "n-gri%C5%BC" = ,"Il-kulur%20bejn%20l-abjad%20u%20l-iswed"
}

$usageMap = @{
    "n-gramma" = @(@{mt="Xtrajt nofs kilogramm laħam, jiġifieri ħames mitt gramma.";en="I bought half a kilogram of meat, that is, five hundred grams."},@{mt="Din ir-riċetta teħtieġ mitejn u ħamsin gramma dqiq.";en="This recipe needs two hundred and fifty grams of flour."})
    "n-grammofonu" = @(@{mt="In-nannu għadu juża l-grammofonu antik tiegħu kull Ħadd filgħodu.";en="My grandfather still uses his old gramophone every Sunday morning."},@{mt="Il-grammofonu kien l-aktar apparat popolari biex tisma' l-mużika fid-dar qabel l-invenzjoni tar-radju.";en="The gramophone was the most popular device for listening to music at home before the invention of the radio."})
    "n-gramofown" = @(@{mt="Il-gramofown qadim ta' missieri għadu jaħdem perfettament.";en="My father's old gramophone still works perfectly."},@{mt="Ġibna l-gramofown għall-festa u daqqejna d-diski l-qodma.";en="We brought the gramophone to the party and played the old records."})
    "n-gran-brittanja" = @(@{mt="Gran Brittanja hija magħrufa għall-istorja twila u l-monarkija tagħha.";en="Great Britain is known for its long history and its monarchy."},@{mt="Il-kapitali ta' Gran Brittanja hija Londra.";en="The capital of Great Britain is London."})
    "n-granf" = @(@{mt="L-ajkla qabdet il-ġurdien bil-granfijiet tagħha u tellgħetu fl-ajru.";en="The eagle caught the mouse with its talons and lifted it into the air."},@{mt="Il-granfijiet tal-għasfur tal-priża huma qawwija ħafna.";en="The talons of the bird of prey are very powerful."})
    "n-grantork" = @(@{mt="Il-bdiewa ħasdu l-grantork fir-rebbiegħa wara xhur ta' kura.";en="The farmers harvested the corn in spring after months of care."},@{mt="Il-grantork jintuża biex isir il-ħobż u ikel ieħor.";en="Maize is used to make bread and other foods."})
    "n-granza" = @(@{mt="Il-granza tintuża bħala għalf għaż-żwiemel u l-baqar.";en="Bran is used as feed for horses and cattle."},@{mt="Iż-żejt tal-granza huwa tajjeb għas-saħħa tal-qalb.";en="Bran oil is good for heart health."})
    "n-granċ" = @(@{mt="Illum il-ġurnata l-granċ huwa ikel prezzjuż ħafna fir-ristoranti.";en="Nowadays crab is very expensive food in restaurants."},@{mt="Sibna granċ kbir fuq il-blat ħdejn il-baħar.";en="We found a large crab on the rocks near the sea."},@{mt="Il-granċijiet jimxu mal-ġenb u jgħixu f'nofs il-blat.";en="Crabs walk sideways and live among the rocks."})
    "adj-gravitazzjonali" = @(@{mt="Il-forza gravitazzjonali tal-qamar tikkawża l-marea fil-baħar.";en="The gravitational force of the moon causes the tides in the sea."},@{mt="Ix-xjentisti studjaw il-mewġ gravitazzjonali mill-ispazju.";en="Scientists have studied gravitational waves from space."})
    "n-gravità" = @(@{mt="Il-gravità tad-Dinja tiġbed kollox lejn iċ-ċentru tagħha.";en="The Earth's gravity pulls everything towards its centre."},@{mt="Ma ndunajtx bil-gravità tas-sitwazzjoni sa meta kien tard wisq.";en="I did not realise the gravity of the situation until it was too late."})
    "n-grawwa" = @(@{mt="Rajna grawwa fil-mistagħdra waqt il-mixja tagħna.";en="We saw a crane in the marsh during our walk."},@{mt="Il-graw jieklu mill-għadajjar u jibnu l-bejtiethom fl-artijiet imxarrbin.";en="Cranes feed from ponds and build their nests in wetlands."})
    "intj-grazzi" = @(@{mt="Grazzi ħafna għall-għajnuna tiegħek illum.";en="Thank you very much for your help today."},@{mt="Grazzi talli ftaħtli l-bieb.";en="Thank you for opening the door for me."},@{mt="Grazzi ta' kollox, verament napprezza.";en="Thank you for everything, I really appreciate it."})
    "n-grazzja" = @(@{mt="Il-balletina żfinet bi grazzja u eleganti kbira fuq il-palk.";en="The ballerina danced with great grace and elegance on the stage."},@{mt="Hija rċeviet il-midalja bil-grazzja u l-umiltà.";en="She received the medal with grace and humility."})
    "n-grech" = @(@{mt="Is-Sur Grech huwa l-għalliem tal-matematika fl-iskola tagħna.";en="Mr Grech is the mathematics teacher at our school."},@{mt="Il-familja Grech ilha tgħix f'dan ir-raħal għal ġenerazzjonijiet.";en="The Grech family has been living in this village for generations."})
    "n-gredenza" = @(@{mt="Poġġejt il-ħwejjeġ nodfa fil-gredenza tal-kamra tas-sodda.";en="I put the clean clothes in the chest of drawers in the bedroom."},@{mt="Il-gredenza tal-injam hija għamara antika li wiret minn nanniti.";en="The wooden chest of drawers is an antique piece of furniture I inherited from my grandmother."})
    "n-gremxul" = @(@{mt="Il-gremxul iħobb joħroġ fix-xemx biex jisħon fuq il-ġebel.";en="Lizards like to come out in the sun to warm up on the stones."},@{mt="Rajna gremxula fuq il-ħajt tal-ġnien dalgħodu.";en="We saw a lizard on the garden wall this morning."})
    "n-greċja" = @(@{mt="Il-Greċja hija magħrufa għall-gżejjer sbieħ u l-baħar ċar tagħha.";en="Greece is known for its beautiful islands and clear sea."},@{mt="Mort il-Greċja s-sajf li għadda u żort l-Akropoli f'Ateni.";en="I went to Greece last summer and visited the Acropolis in Athens."})
    "adj-grieg" = @(@{mt="L-ikel Grieg huwa wieħed mill-aktar ikel b'saħħtu fid-dinja.";en="Greek food is one of the healthiest in the world."},@{mt="Il-lingwa Griega għandha storja ta' aktar minn tlett elef sena.";en="The Greek language has a history of more than three thousand years."})
    "n-grieg" = @(@{mt="Huwa Grieg u jitkellem bil-Grieg u bl-Ingliż perfettament.";en="He is Greek and speaks Greek and English perfectly."},@{mt="Il-Grieg hija lingwa antika b'alfabett differenti minn tagħna.";en="Greek is an ancient language with a different alphabet from ours."})
    "n-grigal" = @(@{mt="Ir-riħ qed jonfoħ mill-grigal illum u għalhekk qed tagħmel kesħa.";en="The wind is blowing from the northeast today and so it is cold."},@{mt="Malta tinsab fil-grigal tal-Afrika.";en="Malta is situated northeast of Africa."})
    "n-grima" = @(@{mt="Is-Sa Grima hi tabiba tajba ħafna.";en="Ms Grima is a very good doctor."},@{mt="Il-familja Grima hija magħrufa sew f'Malta.";en="The Grima family is well known in Malta."})
    "adj-grixti" = @(@{mt="Dak ir-raġel huwa grixti u ma jħobbx jitkellem man-nies.";en="That man is unsociable and does not like to talk to people."},@{mt="Il-klieb grixtin huma perikolużi għaliex jistgħu jigdemu.";en="Savage dogs are dangerous because they can bite."})
    "n-griġjol" = @(@{mt="Il-griġjol jintuża biex idubu l-metalli fih f'temperaturi għoljin.";en="The crucible is used to melt metals in it at high temperatures."},@{mt="Il-griġjoli tal-ħadid ilhom jintużaw minn żminijiet antiki.";en="Iron crucibles have been used since ancient times."})
    "adj-griż" = @(@{mt="Il-qattus għandu pil griż u għajnejn ħodor sbieħ.";en="The cat has grey fur and beautiful green eyes."},@{mt="Il-ġakketta griża tiegħi tmur ma' kull qalziet.";en="My grey jacket goes with every pair of trousers."})
    "n-griż" = @(@{mt="Il-griż huwa kulur newtrali li jmur ma' kważi kull kulur ieħor.";en="Grey is a neutral colour that goes with almost every other colour."},@{mt="L-aktar kuluri li nħobb huma l-griż u l-blu.";en="My favourite colours are grey and blue."})
}

function UrlDecode([string]$s) {
    return [System.Web.HttpUtility]::UrlDecode($s)
}

$lines = Get-Content $inputPath | Where-Object { $_.Trim() -ne "" }
$outLines = @()
$stats = @{total=0; tagsRemoved=0; scratchpadRemoved=0; defsMerged=0; textMtAdded=0; usageExamplesAdded=0; semicolonSplits=0}

foreach ($line in $lines) {
    try {
        $obj = $line | ConvertFrom-Json
        $stats.total++
        $entryId = $obj.entry.id

        # 1. Remove _scratchpad
        if ($obj.PSObject.Properties.Match('_scratchpad').Count -gt 0) {
            $obj.PSObject.Properties.Remove('_scratchpad')
            $stats.scratchpadRemoved++
        }

        # 2. Tag validation (root level)
        $validTags = @()
        if ($obj.tags) {
            foreach ($tag in $obj.tags) {
                if ($approvedTags -contains $tag.name) {
                    $validTags += $tag
                } else {
                    $stats.tagsRemoved++
                }
            }
        }
        $obj.tags = $validTags

        $validEntryTags = @()
        if ($obj.entry_tags) {
            foreach ($et in $obj.entry_tags) {
                $tagStillExists = $false
                foreach ($tag in $validTags) {
                    if ($tag.id -eq $et.tag_id) { $tagStillExists = $true; break }
                }
                if ($tagStillExists) { $validEntryTags += $et }
            }
        }
        $obj.entry_tags = $validEntryTags

        # 3. Merge split definitions (unclosed parens)
        $defs = $obj.entry.definitions
        $mergedDefs = @()
        $i = 0
        while ($i -lt $defs.Count) {
            $currentEn = $defs[$i].text_en
            $openCount = ($currentEn.ToCharArray() | Where-Object {$_ -eq '('}).Count
            $closeCount = ($currentEn.ToCharArray() | Where-Object {$_ -eq ')'}).Count

            if ($openCount -gt $closeCount -and $i + 1 -lt $defs.Count) {
                $mergedEn = $currentEn
                $mergedMt = $defs[$i].text_mt
                $j = $i + 1
                while ($j -lt $defs.Count) {
                    $mergedEn += " " + $defs[$j].text_en
                    if ($mergedMt -or $defs[$j].text_mt) {
                        if ($mergedMt -and $defs[$j].text_mt) { $mergedMt = $mergedMt + " " + $defs[$j].text_mt }
                        elseif ($defs[$j].text_mt) { $mergedMt = $defs[$j].text_mt }
                    }
                    $openCount = ($mergedEn.ToCharArray() | Where-Object {$_ -eq '('}).Count
                    $closeCount = ($mergedEn.ToCharArray() | Where-Object {$_ -eq ')'}).Count
                    if ($openCount -le $closeCount) { $j++; break }
                    $j++
                }
                $mergedDefs += @{text_en=$mergedEn; text_mt=$mergedMt; register=$defs[$i].register; nuance=$defs[$i].nuance}
                $i = $j
                $stats.defsMerged++
            } else {
                $mergedDefs += $defs[$i]
                $i++
            }
        }

        # 4. Split at semicolons in text_en or text_mt
        $finalDefs = @()
        foreach ($def in $mergedDefs) {
            $enSc = $def.text_en -and $def.text_en.Contains(';')
            $mtSc = $def.text_mt -and $def.text_mt.Contains(';')
            if ($enSc -or $mtSc) {
                $enP = if ($def.text_en) { $def.text_en -split ';' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" } } else { @($null) }
                $mtP = if ($def.text_mt) { $def.text_mt -split ';' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" } } else { @($null) }
                $mx = [Math]::Max($enP.Count, $mtP.Count)
                for ($k = 0; $k -lt $mx; $k++) {
                    $finalDefs += @{text_en=if($k-lt$enP.Count){$enP[$k]}else{""}; text_mt=if($k-lt$mtP.Count){$mtP[$k]}else{$null}; register=$def.register; nuance=$def.nuance}
                }
                $stats.semicolonSplits++
            } else {
                $finalDefs += $def
            }
        }
        $obj.entry.definitions = $finalDefs

        # 5. Add text_mt from map
        $customMt = $textMtMap[$entryId]
        if ($customMt) {
            $stats.textMtAdded++
            for ($d = 0; $d -lt [Math]::Min($customMt.Count, $obj.entry.definitions.Count); $d++) {
                $obj.entry.definitions[$d].text_mt = UrlDecode($customMt[$d])
            }
            # If more custom defs than existing, add definition entries
            if ($customMt.Count -gt $obj.entry.definitions.Count) {
                for ($d = $obj.entry.definitions.Count; $d -lt $customMt.Count; $d++) {
                    $obj.entry.definitions += @{text_en=""; text_mt=UrlDecode($customMt[$d]); register=""; nuance=""}
                }
            }
        }

        # 6. Add usage examples
        $customUe = $usageMap[$entryId]
        if ($customUe) {
            $stats.usageExamplesAdded++
            $examples = @()
            foreach ($ue in $customUe) {
                $examples += @{mt=$ue.mt; en=$ue.en}
            }
            $obj.entry.usage_examples = $examples
        }

        $outLines += ($obj | ConvertTo-Json -Depth 15 -Compress)
    } catch {
        Write-Error "Error: $($_.Exception.Message)"
        $outLines += $line
    }
}

$outLines | Out-File -FilePath $outputPath -Encoding utf8
Write-Output "=== PROCESSING COMPLETE ==="
Write-Output "Total entries: $($stats.total)"
Write-Output "Scratchpads removed: $($stats.scratchpadRemoved)"
Write-Output "Invalid tags removed: $($stats.tagsRemoved)"
Write-Output "Definitions merged: $($stats.defsMerged)"
Write-Output "Semicolon splits: $($stats.semicolonSplits)"
Write-Output "text_mt added: $($stats.textMtAdded)"
Write-Output "Usage examples added: $($stats.usageExamplesAdded)"

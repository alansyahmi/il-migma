# Process batch_008.jsonl - refine entries
$inputFile = "c:\Projects\il-migma\wiktionary-scraper\_f_batches\batch_008.jsonl"
$outputFile = "c:\Projects\il-migma\wiktionary-scraper\_f_batches\refined\batch_008.jsonl"

$approvedTags = @(
    "common", "rare", "archaic", "neologism", "purist", "formal", "literary",
    "colloquial", "obsolete", "technical", "dialectal", "gozitan", "slang",
    "vulgar", "euphemistic", "figurative", "pejorative", "childish",
    "agriculture", "anatomy", "animals", "architecture", "art", "astronomy",
    "sea", "botany", "geography", "food", "commerce", "family", "physics",
    "war", "law", "mathematics", "medicine", "music", "politics", "religion",
    "crafts", "sports", "technology", "weather", "transport", "time"
)

# Helper: build a tag object
function New-Tag($name) {
    return @{id = "tag-$name"; name = $name; category = "Usage"; description = $null}
}

# Helper: generate usage examples per headword
function Get-UsageExamples($headword, $pos) {
    switch ($headword) {
        "felu" {
            return @(
                @{mt = "Il-merħla kellha felu sabiħ ħafna."; en = "The herd had a very beautiful foal."},
                @{mt = "Tħallix rasek Tgħid li dan il-felu għadu ma jaf xejn."; en = "Do not let it go to your head; this colt still knows nothing."},
                @{mt = "Dak it-tifel għadu felu, ma jifhem xejn mid-dinja."; en = "That boy is still a colt, he understands nothing of the world."}
            )
        }
        "felul" {
            return @(
                @{mt = "It-tabib neħħieli l-felul b'-laser."; en = "The doctor removed my wart with a laser."},
                @{mt = "Hemm krema tajba għat-tneħħija tal-felul."; en = "There is a good cream for removing verrucas."}
            )
        }
        "felħ" {
            return @(
                @{mt = "Il-felħ ta' dan ir-raġel huwa straordinarju."; en = "This man's vigour is extraordinary."},
                @{mt = "Bil-felħ kollu tiegħu, irnexxielu jlesti x-xogħol."; en = "With all his vigour, he managed to finish the work."}
            )
        }
        "felħan" {
            return @(
                @{mt = "Huwa raġel felħan u dejjem lest jgħin."; en = "He is a vigorous man and always ready to help."},
                @{mt = "Iż-żwiemel felħana ġibdu l-karru sa fuq l-għolja."; en = "The vigorous horses pulled the cart up the hill."}
            )
        }
        "felħani" {
            return @(
                @{mt = "Il-ġuvni kien felħani u mimli saħħa."; en = "The young man was vigorous and full of strength."},
                @{mt = "In-nies felħanin jgħixu ħajja aħjar."; en = "Vigorous people live a better life."}
            )
        }
        "felħi" {
            return @(
                @{mt = "Huwa felħi u dejjem jilħaq l-għanijiet tiegħu."; en = "He is vigorous and always achieves his goals."},
                @{mt = "Il-pjanti felħin jikbru malajr f'dan il-ħamrija."; en = "Vigorous plants grow quickly in this soil."}
            )
        }
        "femminil" {
            return @(
                @{mt = "L-isem 'xemx' huwa ta' ġeneru femminil bil-Malti."; en = "The word 'xemx' is of feminine gender in Maltese."},
                @{mt = "Qegħdin nitgħallmu d-differenza bejn il-ġeneru maskili u l-femminil."; en = "We are learning the difference between masculine and feminine gender."}
            )
        }
        "femminili" {
            return @(
                @{mt = "Il-karatteristiċi femminili huma diversi u uniċi."; en = "Feminine characteristics are diverse and unique."},
                @{mt = "Din il-libsa għandha disinn femminili elegant."; en = "This dress has an elegant feminine design."}
            )
        }
        "femminilità" {
            return @(
                @{mt = "Il-femminilità mhix definita mid-dehra biss."; en = "Femininity is not defined by appearance alone."},
                @{mt = "Hija tħaddan il-femminilità tagħha b'kburija."; en = "She embraces her femininity with pride."}
            )
        }
        "femminin" {
            return @(
                @{mt = "'Tifla' hija nom femminin bil-Malti."; en = "'Tifla' is a feminine noun in Maltese."},
                @{mt = "Il-ġeneru femminin għandu regoli grammatikali speċifiċi."; en = "The feminine gender has specific grammatical rules."}
            )
        }
        "femminiżmu" {
            return @(
                @{mt = "Il-femminiżmu għen biex jitjiebu d-drittijiet tan-nasa."; en = "Feminism has helped improve women's rights."},
                @{mt = "Ħafna nisa jappoġġjaw il-moviment tal-femminiżmu."; en = "Many women support the feminism movement."},
                @{mt = "Il-femminiżmu jippromwovi l-ugwaljanza bejn is-sessi."; en = "Feminism promotes equality between the sexes."}
            )
        }
        "fena" {
            return @(
                @{mt = "Ix-xogħol eżawrjenti fena lil Pawlu."; en = "The exhausting work exhausted Paul."},
                @{mt = "Tħallix l-inkwiet jifnija ruħek."; en = "Do not let worry exhaust your soul."},
                @{mt = "Il-vjaġġ twil fiena lill-vjaġġaturi."; en = "The long journey tired out the travellers."}
            )
        }
        "fenda" {
            return @(
                @{mt = "Il-karru fenda 'l isfel mit-triq."; en = "The cart trundled down the road."},
                @{mt = "Huwa fenda tajjeb għalih innifsu fid-diskussjoni."; en = "He fended well for himself in the discussion."},
                @{mt = "Dan in-negozju fenda sew f'dawn l-aħħar snin."; en = "This business has been profitable in recent years."},
                @{mt = "Il-kittieb fenda siltiet minn xogħlijiet oħra."; en = "The writer interpolated passages from other works."}
            )
        }
        "Fenech" {
            return @(
                @{mt = "Is-Sur Fenech jgħix fil-belt kapitali."; en = "Mr Fenech lives in the capital city."},
                @{mt = "Il-familja Fenech ilha tgħix Malta għal sekli sħaħ."; en = "The Fenech family has been living in Malta for centuries."}
            )
        }
        "fenek" {
            return @(
                @{mt = "Il-fenek jaħrab malajr meta jibża'."; en = "The rabbit runs away quickly when frightened."},
                @{mt = "F'Malta, il-fenek huwa annimal popolari kemm bħala pet kif ukoll għall-ikel."; en = "In Malta, the rabbit is a popular animal both as a pet and for food."},
                @{mt = "Rajna fenek selvaġġ fl-għelieqi."; en = "We saw a wild rabbit in the fields."}
            )
        }
        "fenka" {
            return @(
                @{mt = "Il-fenka welldet ħames ferħat żgħar."; en = "The doe gave birth to five small kits."},
                @{mt = "Il-fenka tiegħi għandha pil artab u abjad."; en = "My female rabbit has soft white fur."}
            )
        }
        "fenkata" {
            return @(
                @{mt = "Il-fenkata hija platt tradizzjonali Malti."; en = "Rabbit stew is a traditional Maltese dish."},
                @{mt = "Nhar il-Ħadd, konna nieklu l-fenkata f'dawn ir-ristoranti."; en = "On Sundays, we used to eat rabbit stew in this restaurant."},
                @{mt = "Din ir-ristorant iservi l-aqwa fenkata fil-gżira."; en = "This restaurant serves the best rabbit stew on the island."}
            )
        }
        "fenkunier" {
            return @(
                @{mt = "Il-fenkuniera iltaqgħu fil-kampanja għall-kaċċa."; en = "The rabbit hunters gathered in the countryside for the hunt."},
                @{mt = "Kien fenkunier imħawwar li kien jaf kull rokna tal-gżejjer."; en = "He was an experienced rabbit hunter who knew every corner of the islands."}
            )
        }
        "fens" {
            return @(
                @{mt = "Ir-raħħal bena fens madwar l-għalqa tiegħu."; en = "The farmer built a fence around his field."},
                @{mt = "Il-fens tal-injam waqa' wara l-maltemp."; en = "The wooden fence fell after the storm."}
            )
        }
        "fera" {
            return @(
                @{mt = "Il-ħġieġa maqsuma feriet lil Marija."; en = "The broken glass injured Mary."},
                @{mt = "Ipprova ma ferix ħadd waqt il-ġlieda."; en = "Try not to wound anyone during the fight."},
                @{mt = "Il-kelma qawwija tista' tferi aktar minn xabla."; en = "A harsh word can wound more than a sword."}
            )
        }
        "feraq" {
            return @(
                @{mt = "Id-dgħajsa ferqet il-baħar bil-mod."; en = "The boat parted the sea slowly."},
                @{mt = "Huwa feraq il-folla biex jgħaddi."; en = "He parted the crowd to get through."},
                @{mt = "Il-moxt feraq xagħarha mingħajr tbatija."; en = "The comb parted her hair without difficulty."}
            )
        }
        "feraħ" {
            return @(
                @{mt = "Ferraħna magħkom fl-okkażjoni ferrieħa tagħkom."; en = "We rejoiced with you on your joyous occasion."},
                @{mt = "Ferraħt lil ommi b'dak ir-rigal sabiħ."; en = "I made my mother happy with that beautiful gift."},
                @{mt = "Il-ġenituri ferħu lit-tifel tagħhom wara li ggradwa."; en = "The parents congratulated their son after he graduated."}
            )
        }
        "fergħ" {
            return @(
                @{mt = "'Fergħ' hija forma antikwata ta' 'fergħa'."; en = "'Fergħ' is a dated form of 'fergħa'."},
                @{mt = "Illum il-ġurnata rari jintuża 'fergħ' minflok 'fergħa'."; en = "Nowadays 'fergħ' is rarely used instead of 'fergħa'."}
            )
        }
        "fergħa" {
            return @(
                @{mt = "Is-siġra għandha ħafna friegħi."; en = "The tree has many branches."},
                @{mt = "Il-fergħa l-ġdida tal-kumpanija fetħet f'Malta."; en = "The new subsidiary of the company opened in Malta."},
                @{mt = "Għasfur bena bejtu fuq fergħa tas-siġra."; en = "A bird built its nest on a branch of the tree."}
            )
        }
        "fergħen" {
            return @(
                @{mt = "Ma jħobbx meta n-nies jifergħnu quddiemu."; en = "He does not like it when people act arrogantly in front of him."},
                @{mt = "Fergħen u għaraq waqt li kien qed jaħdem fl-għelieqi."; en = "He sweated and cursed while working in the fields."}
            )
        }
        default { return @() }
    }
}

$entries = Get-Content $inputFile | Where-Object { $_.Trim() -ne "" }

$outputLines = foreach ($line in $entries) {
    $obj = $line | ConvertFrom-Json

    # Remove _scratchpad
    $obj.PSObject.Properties.Remove('_scratchpad')

    $entry = $obj.entry
    $headword = $entry.headword
    $pos = $entry.pos

    # --- FILL text_mt ---
    foreach ($def in $entry.definitions) {
        if (-not $def.text_mt) {
            $en = $def.text_en
            $mt = ""

            switch -Wildcard ($en) {
                # felu
                "foal*" { $mt = "Felh ta' żiemel jew ħmar li niftam u għandu bejn sena u sentejn." }
                "immature*" { $mt = "Persuna żagħżugħa jew mingħajr esperjenza." }

                # felul
                "wart*" { $mt = "Tkabbir żgħir u iebes fil-ġilda kkawżat minn virus." }

                # felħ
                "verbal noun*" { $mt = "Nom verbali ta' felaħ." }
                "vigor" { $mt = "Qawwa u enerġija fiżika jew mentali." }

                # felħan, felħani, felħi
                "strong*" { $mt = "B'saħħtu u enerġetiku." }

                # femminil
                "feminine gender" { $mt = "Ġeneru grammatikali tan-nisa." }

                # femminili
                "feminine" { $mt = "Li għandu x'jaqsam man-nisa jew mal-ġeneru femminili." }

                # femminilità
                "femininity" { $mt = "Kwalità jew stat li tkun mara jew femminili." }

                # femminiżmu
                "feminism" { $mt = "Moviment soċjali u politiku li jippromwovi d-drittijiet tan-nisa u l-ugwaljanza bejn is-sessi." }

                # fena
                "to exhaust*" { $mt = "Tgħejja lil xi ħadd, speċjalment spiritwalment." }

                # fenda - definitions
                "to trundle*" { $mt = "Irrombla jew ġarr bil-mod." }
                "to fend" { $mt = "Iddefenda jew ipproteġi minn." }
                "to be profitable" { $mt = "Kun profittabbli jew ta' benefiċċju." }
                "to interpolate*" { $mt = "Daħħal kliem jew informazzjoni ġdida f'nofs test jew diskors." }

                # Fenech
                "a surname" { $mt = "Kunjom." }

                # fenek
                "rabbit" { $mt = "Mammiferu żgħir tal-familja Leporidae, b'widnejn twal u denb qasir." }

                # fenka
                "female equivalent*" { $mt = "Fenek mara." }

                # fenkata
                "rabbit stew" { $mt = "Stuffat tal-fenek, ikla tradizzjonali Maltija." }

                # fenkunier
                "rabbit hunter" { $mt = "Kaċċatur tal-fenek." }

                # fens
                "fence*" { $mt = "Ħajt jew struttura tal-metall jew tal-injam li tagħlaq jew tipproteġi żona ta' art." }

                # fera
                "to injure*" { $mt = "Tagħmel ħsara fiżika lil xi ħadd, speċjalment b'arma." }

                # feraq - definitions
                "to pass through*" { $mt = "Għadda minn ġo xi ħaġa, qasam jew fired." }
                "to split*" { $mt = "Fired jew ssepara." }

                # feraħ - definitions
                "to be glad*" { $mt = "Kun ferħan jew mimli ferħ." }
                "to congratulate*" { $mt = "Ferraħ lil xi ħadd, għamillu awguri." }

                # fergħ
                "dated form*" { $mt = "Forma antikwata ta' fergħa." }

                # fergħa - definitions
                "branch*" { $mt = "Fergħa jew rimja ta' siġra." }
                "subsidiary" { $mt = "Ferjata, diviżjoni jew dipartiment sekondarju." }

                # fergħen - definitions
                "to be arrogant" { $mt = "Kun supperv jew kburi żżejjed." }
                "to sweat*" { $mt = "Għaraq jew saħar b'mod qawwi." }

                default { $mt = $en }
            }

            $def.text_mt = $mt
        }
    }

    # --- ADD usage examples ---
    $examples = Get-UsageExamples $headword $pos
    $entry.usage_examples = @()
    foreach ($ex in $examples) {
        $entry.usage_examples += @{mt = $ex.mt; en = $ex.en}
    }

    # --- VALIDATE & FILTER tags ---
    if ($obj.tags -and $obj.tags.Count -gt 0) {
        $validTags = $obj.tags | Where-Object {
            $approvedTags -contains $_.name
        }
        if ($validTags.Count -gt 0) {
            $obj.tags = @($validTags)
        } else {
            $obj.tags = @()
        }
    }

    # Also filter entry_tags based on remaining valid tags
    if ($obj.entry_tags -and $obj.tags -and $obj.tags.Count -gt 0) {
        $validTagIds = $obj.tags | ForEach-Object { $_.id }
        $obj.entry_tags = $obj.entry_tags | Where-Object { $validTagIds -contains $_.tag_id }
    } elseif ($obj.entry_tags) {
        $obj.entry_tags = @()
    }

    # Convert back to JSON - compact
    $obj | ConvertTo-Json -Depth 100 -Compress
}

$outputLines | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "Processed $($outputLines.Count) entries. Output written to $outputFile"

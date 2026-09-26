/**
 * The passage the book strategy reads from: the opening of Poe's "The
 * Purloined Letter" (1844), whose narrator plays exactly this game and whose
 * method the 1950s papers keep circling back to.
 *
 * Taken from Project Gutenberg's text (ebook #2148, public domain), folded to
 * lower case with punctuation removed. It is long enough — about twelve
 * thousand letters — that no run the lab or its tests make reaches the end. A
 * shorter passage was used before and read modulo its length, and a looping
 * passage is not a book: a context model learns the loop, which says nothing
 * about copying letters from prose.
 */
export const PASSAGE =
  'at paris just after dark one gusty evening in the autumn of eighteen i was enjoying the twofold ' +
  'luxury of meditation and a meerschaum in company with my friend c auguste dupin in his little ' +
  'back library or book closet au troisieme no thirty three rue dunot faubourg st germain for one ' +
  'hour at least we had maintained a profound silence while each to any casual observer might have ' +
  'seemed intently and exclusively occupied with the curling eddies of smoke that oppressed the ' +
  'atmosphere of the chamber for myself however i was mentally discussing certain topics which had ' +
  'formed matter for conversation between us at an earlier period of the evening i mean the affair ' +
  'of the rue morgue and the mystery attending the murder of marie roget i looked upon it therefore ' +
  'as something of a coincidence when the door of our apartment was thrown open and admitted our ' +
  'old acquaintance monsieur g the prefect of the parisian police we gave him a hearty welcome for ' +
  'there was nearly half as much of the entertaining as of the contemptible about the man and we ' +
  'had not seen him for several years we had been sitting in the dark and dupin now arose for the ' +
  'purpose of lighting a lamp but sat down again without doing so upon g s saying that he had ' +
  'called to consult us or rather to ask the opinion of my friend about some official business ' +
  'which had occasioned a great deal of trouble if it is any point requiring reflection observed ' +
  'dupin as he forebore to enkindle the wick we shall examine it to better purpose in the dark that ' +
  'is another of your odd notions said the prefect who had a fashion of calling every thing odd ' +
  'that was beyond his comprehension and thus lived amid an absolute legion of oddities very true ' +
  'said dupin as he supplied his visitor with a pipe and rolled towards him a comfortable chair and ' +
  'what is the difficulty now i asked nothing more in the assassination way i hope oh no nothing of ' +
  'that nature the fact is the business is very simple indeed and i make no doubt that we can ' +
  'manage it sufficiently well ourselves but then i thought dupin would like to hear the details of ' +
  'it because it is so excessively odd simple and odd said dupin why yes and not exactly that ' +
  'either the fact is we have all been a good deal puzzled because the affair is so simple and yet ' +
  'baffles us altogether perhaps it is the very simplicity of the thing which puts you at fault ' +
  'said my friend what nonsense you do talk replied the prefect laughing heartily perhaps the ' +
  'mystery is a little too plain said dupin oh good heavens who ever heard of such an idea a little ' +
  'too self evident ha ha haha ha ha ho ho ho roared our visitor profoundly amused oh dupin you ' +
  'will be the death of me yet and what after all is the matter on hand i asked why i will tell you ' +
  'replied the prefect as he gave a long steady and contemplative puff and settled himself in his ' +
  'chair i will tell you in a few words but before i begin let me caution you that this is an ' +
  'affair demanding the greatest secrecy and that i should most probably lose the position i now ' +
  'hold were it known that i confided it to any one proceed said i or not said dupin well then i ' +
  'have received personal information from a very high quarter that a certain document of the last ' +
  'importance has been purloined from the royal apartments the individual who purloined it is known ' +
  'this beyond a doubt he was seen to take it it is known also that it still remains in his ' +
  'possession how is this known asked dupin it is clearly inferred replied the prefect from the ' +
  'nature of the document and from the non appearance of certain results which would at once arise ' +
  'from its passing out of the robbers possession that is to say from his employing it as he must ' +
  'design in the end to employ it be a little more explicit i said well i may venture so far as to ' +
  'say that the paper gives its holder a certain power in a certain quarter where such power is ' +
  'immensely valuable the prefect was fond of the cant of diplomacy still i do not quite understand ' +
  'said dupin no well the disclosure of the document to a third person who shall be nameless would ' +
  'bring in question the honor of a personage of most exalted station and this fact gives the ' +
  'holder of the document an ascendancy over the illustrious personage whose honor and peace are so ' +
  'jeopardized but this ascendancy i interposed would depend upon the robbers knowledge of the ' +
  'losers knowledge of the robber who would dare the thief said g is the minister d who dares all ' +
  'things those unbecoming as well as those becoming a man the method of the theft was not less ' +
  'ingenious than bold the document in questiona letter to be frankhad been received by the ' +
  'personage robbed while alone in the royal boudoir during its perusal she was suddenly ' +
  'interrupted by the entrance of the other exalted personage from whom especially it was her wish ' +
  'to conceal it after a hurried and vain endeavor to thrust it in a drawer she was forced to place ' +
  'it open as it was upon a table the address however was uppermost and the contents thus unexposed ' +
  'the letter escaped notice at this juncture enters the minister d his lynx eye immediately ' +
  'perceives the paper recognises the handwriting of the address observes the confusion of the ' +
  'personage addressed and fathoms her secret after some business transactions hurried through in ' +
  'his ordinary manner he produces a letter somewhat similar to the one in question opens it ' +
  'pretends to read it and then places it in close juxtaposition to the other again he converses ' +
  'for some fifteen minutes upon the public affairs at length in taking leave he takes also from ' +
  'the table the letter to which he had no claim its rightful owner saw but of course dared not ' +
  'call attention to the act in the presence of the third personage who stood at her elbow the ' +
  'minister decamped leaving his own letterone of no importanceupon the table here then said dupin ' +
  'to me you have precisely what you demand to make the ascendancy completethe robbers knowledge of ' +
  'the losers knowledge of the robber yes replied the prefect and the power thus attained has for ' +
  'some months past been wielded for political purposes to a very dangerous extent the personage ' +
  'robbed is more thoroughly convinced every day of the necessity of reclaiming her letter but this ' +
  'of course cannot be done openly in fine driven to despair she has committed the matter to me ' +
  'than whom said dupin amid a perfect whirlwind of smoke no more sagacious agent could i suppose ' +
  'be desired or even imagined you flatter me replied the prefect but it is possible that some such ' +
  'opinion may have been entertained it is clear said i as you observe that the letter is still in ' +
  'possession of the minister since it is this possession and not any employment of the letter ' +
  'which bestows the power with the employment the power departs true said g and upon this ' +
  'conviction i proceeded my first care was to make thorough search of the ministers hotel and here ' +
  'my chief embarrassment lay in the necessity of searching without his knowledge beyond all things ' +
  'i have been warned of the danger which would result from giving him reason to suspect our design ' +
  'but said i you are quite au fait in these investigations the parisian police have done this ' +
  'thing often before oh yes and for this reason i did not despair the habits of the minister gave ' +
  'me too a great advantage he is frequently absent from home all night his servants are by no ' +
  'means numerous they sleep at a distance from their masters apartment and being chiefly ' +
  'neapolitans are readily made drunk i have keys as you know with which i can open any chamber or ' +
  'cabinet in paris for three months a night has not passed during the greater part of which i have ' +
  'not been engaged personally in ransacking the d hotel my honor is interested and to mention a ' +
  'great secret the reward is enormous so i did not abandon the search until i had become fully ' +
  'satisfied that the thief is a more astute man than myself i fancy that i have investigated every ' +
  'nook and corner of the premises in which it is possible that the paper can be concealed but is ' +
  'it not possible i suggested that although the letter may be in possession of the minister as it ' +
  'unquestionably is he may have concealed it elsewhere than upon his own premises this is barely ' +
  'possible said dupin the present peculiar condition of affairs at court and especially of those ' +
  'intrigues in which d is known to be involved would render the instant availability of the ' +
  'documentits susceptibility of being produced at a moments noticea point of nearly equal ' +
  'importance with its possession its susceptibility of being produced said i that is to say of ' +
  'being destroyed said dupin true i observed the paper is clearly then upon the premises as for ' +
  'its being upon the person of the minister we may consider that as out of the question entirely ' +
  'said the prefect he has been twice waylaid as if by footpads and his person rigorously searched ' +
  'under my own inspection you might have spared yourself this trouble said dupin d i presume is ' +
  'not altogether a fool and if not must have anticipated these waylayings as a matter of course ' +
  'not altogether a fool said g but then hes a poet which i take to be only one remove from a fool ' +
  'true said dupin after a long and thoughtful whiff from his meerschaum although i have been ' +
  'guilty of certain doggrel myself suppose you detail said i the particulars of your search why ' +
  'the fact is we took our time and we searched everywhere i have had long experience in these ' +
  'affairs i took the entire building room by room devoting the nights of a whole week to each we ' +
  'examined first the furniture of each apartment we opened every possible drawer and i presume you ' +
  'know that to a properly trained police agent such a thing as a secret drawer is impossible any ' +
  'man is a dolt who permits a secret drawer to escape him in a search of this kind the thing is so ' +
  'plain there is a certain amount of bulkof spaceto be accounted for in every cabinet then we have ' +
  'accurate rules the fiftieth part of a line could not escape us after the cabinets we took the ' +
  'chairs the cushions we probed with the fine long needles you have seen me employ from the tables ' +
  'we removed the tops why so sometimes the top of a table or other similarly arranged piece of ' +
  'furniture is removed by the person wishing to conceal an article then the leg is excavated the ' +
  'article deposited within the cavity and the top replaced the bottoms and tops of bedposts are ' +
  'employed in the same way but could not the cavity be detected by sounding i asked by no means if ' +
  'when the article is deposited a sufficient wadding of cotton be placed around it besides in our ' +
  'case we were obliged to proceed without noise but you could not have removedyou could not have ' +
  'taken to pieces all articles of furniture in which it would have been possible to make a deposit ' +
  'in the manner you mention a letter may be compressed into a thin spiral roll not differing much ' +
  'in shape or bulk from a large knitting needle and in this form it might be inserted into the ' +
  'rung of a chair for example you did not take to pieces all the chairs certainly not but we did ' +
  'betterwe examined the rungs of every chair in the hotel and indeed the jointings of every ' +
  'description of furniture by the aid of a most powerful microscope had there been any traces of ' +
  'recent disturbance we should not have failed to detect it instantly a single grain of gimlet ' +
  'dust for example would have been as obvious as an apple any disorder in the glueingany unusual ' +
  'gaping in the jointswould have sufficed to insure detection i presume you looked to the mirrors ' +
  'between the boards and the plates and you probed the beds and the bed clothes as well as the ' +
  'curtains and carpets that of course and when we had absolutely completed every particle of the ' +
  'furniture in this way then we examined the house itself we divided its entire surface into ' +
  'compartments which we numbered so that none might be missed then we scrutinized each individual ' +
  'square inch throughout the premises including the two houses immediately adjoining with the ' +
  'microscope as before the two houses adjoining i exclaimed you must have had a great deal of ' +
  'trouble we had but the reward offered is prodigious you include the grounds about the houses all ' +
  'the grounds are paved with brick they gave us comparatively little trouble we examined the moss ' +
  'between the bricks and found it undisturbed you looked among ds papers of course and into the ' +
  'books of the library certainly we opened every package and parcel we not only opened every book ' +
  'but we turned over every leaf in each volume not contenting ourselves with a mere shake ' +
  'according to the fashion of some of our police officers we also measured the thickness of every ' +
  'book cover with the most accurate admeasurement and applied to each the most jealous scrutiny of ' +
  'the microscope had any of the bindings been recently meddled with it would have been utterly ' +
  'impossible that the fact should have escaped observation some five or six volumes just from the ' +
  'hands of the binder we carefully probed longitudinally with the needles you explored the floors ' +
  'beneath the carpets beyond doubt we removed every carpet and examined the boards with the ' +
  'microscope and the paper on the walls yes you looked into the cellars we did then i said you ' +
  'have been making a miscalculation and the letter is not upon the premises as you suppose i fear ' +
  'you are right there said the prefect and now dupin what would you advise me to do to make a ' +
  'thorough re search of the premises that is absolutely needless replied g i am not more sure that ' +
  'i breathe than i am that the letter is not at the hotel i have no better advice to give you said ' +
  'dupin you have of course an accurate description of the letter oh yes and here the prefect ' +
  'producing a memorandum book proceeded to read aloud a minute account of the internal and ' +
  'especially of the external appearance of the missing document soon after finishing the perusal ' +
  'of this description he took his departure more entirely depressed in spirits than i had ever ' +
  'known the good gentleman before in about a month afterwards he paid us another visit and found ' +
  'us occupied very nearly as before he took a pipe and a chair and entered into some ordinary ' +
  'conversation at length i said well but g what of the purloined letter i presume you have at last ' +
  'made up your mind that there is no such thing as overreaching the minister confound him say iyes ' +
  'i made the re examination however as dupin suggestedbut it was all labor lost as i knew it would ' +
  'be how much was the reward offered did you say asked dupin why a very great deala very liberal ' +
  'rewardi dont like to say how much precisely but one thing i will say that i wouldnt mind giving ' +
  'my individual check for fifty thousand francs to any one who could obtain me that';

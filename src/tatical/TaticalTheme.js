module.exports = class TaticalTheme {

    /**
     * 
     * @param {string} name 
     * @param {{
     *   descriptionFavorite: string,
     *   descriptionError: string,
     *   alter: boolean,
     *   onlyBestPv: boolean,
     *   types: ("BEST"|"BRILHANTE"|"CRITICAL"|"EXCELENT"|"BOM"|"IMPRUDENTE"|"MISTAKE"|"TATICAL_ERROR"|"CAPIVARADA"|"VITORIA_PERDIDA")[]
     * }} options 
     */
    constructor(name, options){

        this.name = name;
        this.description = options.descriptionFavorite;
        this.descriptionError = options.descriptionError;
        this.alter = !!options.alter;
        this.types = options.types;
        this.onlyBestPv = options.onlyBestPv;

    }

    hasType(type){
        return this.types.includes(type);
    }

}
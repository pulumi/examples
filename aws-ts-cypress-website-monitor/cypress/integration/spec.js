describe('Pulumi Console', function() {

    it("renders the sign-in page", function() {
        cy.visit('https://app.pulumi.com/');

        cy.get("h1").then(h1 => {
            expect(h1.text()).to.eq("An easier cloud computing experience awaits");
        });
    });
});

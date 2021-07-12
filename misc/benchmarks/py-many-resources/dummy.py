import pulumi


class Dummy(pulumi.ComponentResource):

    def __init__(self, name, deadweight, opts=None):
        super().__init__('examples:dummy:Dummy', name, {'deadweight': deadweight}, opts)

        self.deadweight = pulumi.Output.from_input(deadweight)
        self.register_outputs({'deadweight': self.deadweight})

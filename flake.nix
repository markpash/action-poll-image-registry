{
  description = "action-poll-image-registry";

  inputs.nixpkgs.url = "nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: {
    devShells.x86_64-linux = let pkgs = nixpkgs.legacyPackages.x86_64-linux; in {
      default = pkgs.mkShell {
        packages = with pkgs; [
          nodejs_20
        ];
      };
    };
  };
}

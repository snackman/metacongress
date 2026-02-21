import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="py-24 text-center">
        <div className="flex items-center justify-center gap-4 mb-6">
          <Image
            src="/logo.svg"
            alt="Meta Senate"
            width={72}
            height={72}
            className=""
          />
        </div>
        <h1 className="text-5xl sm:text-7xl font-light tracking-wide">
          <span className="text-white">Meta </span>
          <span className="text-white">Senate</span>
        </h1>
        <p className="mt-6 text-xl text-gray-400 max-w-2xl mx-auto">
          A governing body for the metaverse elected from the foremost
          communities.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/communities"
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors"
          >
            Explore Communities
          </Link>
          <Link
            href="/delegate"
            className="px-8 py-3 border border-gray-600 hover:border-gray-400 rounded-lg font-semibold transition-colors"
          >
            Delegate Tokens
          </Link>
        </div>
      </section>

      <section className="py-16 grid md:grid-cols-3 gap-8">
        <div className="p-6 rounded-xl bg-gray-900 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-2">
            1. Communities Elect
          </h3>
          <p className="text-gray-400">
            NFT holders declare candidacy and vote to elect two senators from
            their community. All data stored fully on-chain.
          </p>
        </div>
        <div className="p-6 rounded-xl bg-gray-900 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-2">
            2. Users Delegate
          </h3>
          <p className="text-gray-400">
            DAO token holders delegate their voting power to the Meta Senate
            Safe.
          </p>
        </div>
        <div className="p-6 rounded-xl bg-gray-900 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-2">
            3. Senators Govern
          </h3>
          <p className="text-gray-400">
            Elected senators use the Meta Senate multisig to vote on DAO
            proposals, representing the collective will of NFT communities.
          </p>
        </div>
      </section>
    </div>
  );
}
